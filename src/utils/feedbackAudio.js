let sharedAudioContext = null;

function getAudioContext() {
    if (typeof window === 'undefined') return null;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!sharedAudioContext) {
        sharedAudioContext = new AudioContextClass();
    }

    if (sharedAudioContext.state === 'suspended') {
        sharedAudioContext.resume().catch(() => {});
    }

    return sharedAudioContext;
}

function scheduleTone(context, startAt, frequency, duration, gainValue, options = {}) {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const filterNode = context.createBiquadFilter();

    oscillator.type = options.type || 'triangle';
    oscillator.frequency.setValueAtTime(frequency, startAt);
    oscillator.detune.setValueAtTime(options.detune || 0, startAt);

    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.exponentialRampToValueAtTime(gainValue, startAt + (options.attack ?? 0.008));
    gainNode.gain.exponentialRampToValueAtTime(
        Math.max(gainValue * (options.sustainLevel ?? 0.7), 0.0001),
        startAt + (duration * (options.sustainPoint ?? 0.45)),
    );
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    filterNode.type = options.filterType || 'lowpass';
    filterNode.frequency.setValueAtTime(options.filterFrequency || 2600, startAt);
    filterNode.Q.setValueAtTime(options.filterQ || 0.7, startAt);

    oscillator.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(startAt);
    oscillator.stop(startAt + duration);
}

function playPattern(tones) {
    const context = getAudioContext();
    if (!context) return;

    const startAt = context.currentTime + 0.01;

    tones.forEach((tone) => {
        scheduleTone(context, startAt + tone.offset, tone.frequency, tone.duration, tone.gain ?? 0.08, tone.options);
    });
}

export function playCorrectSound() {
    playPattern([
        {
            offset: 0,
            frequency: 587.33,
            duration: 0.12,
            gain: 0.11,
            options: { type: 'triangle', filterFrequency: 3200, sustainLevel: 0.55, sustainPoint: 0.32 },
        },
        {
            offset: 0.08,
            frequency: 880,
            duration: 0.18,
            gain: 0.13,
            options: { type: 'triangle', filterFrequency: 3600, sustainLevel: 0.52, sustainPoint: 0.36 },
        },
        {
            offset: 0.08,
            frequency: 1320,
            duration: 0.14,
            gain: 0.04,
            options: { type: 'sine', filterFrequency: 4200, sustainLevel: 0.45, sustainPoint: 0.28 },
        },
    ]);
}

export function playIncorrectSound() {
    playPattern([
        {
            offset: 0,
            frequency: 311.13,
            duration: 0.09,
            gain: 0.13,
            options: { type: 'square', filterFrequency: 1800, filterQ: 1.2, sustainLevel: 0.42, sustainPoint: 0.22 },
        },
        {
            offset: 0.075,
            frequency: 246.94,
            duration: 0.12,
            gain: 0.14,
            options: { type: 'square', filterFrequency: 1500, filterQ: 1.4, sustainLevel: 0.38, sustainPoint: 0.24 },
        },
        {
            offset: 0.15,
            frequency: 196,
            duration: 0.16,
            gain: 0.12,
            options: { type: 'triangle', filterFrequency: 1300, sustainLevel: 0.35, sustainPoint: 0.26 },
        },
    ]);
}

export function playSoftCorrectSound() {
    playPattern([
        {
            offset: 0,
            frequency: 523.25,
            duration: 0.14,
            gain: 0.07,
            options: { type: 'sine', filterFrequency: 2500, sustainLevel: 0.5, sustainPoint: 0.3 },
        },
        {
            offset: 0.07,
            frequency: 659.25,
            duration: 0.16,
            gain: 0.08,
            options: { type: 'triangle', filterFrequency: 2800, sustainLevel: 0.48, sustainPoint: 0.34 },
        },
    ]);
}

export function playSoftIncorrectSound() {
    playPattern([
        {
            offset: 0,
            frequency: 261.63,
            duration: 0.08,
            gain: 0.075,
            options: { type: 'sine', filterFrequency: 1400, sustainLevel: 0.4, sustainPoint: 0.22 },
        },
        {
            offset: 0.075,
            frequency: 220,
            duration: 0.11,
            gain: 0.065,
            options: { type: 'triangle', filterFrequency: 1200, sustainLevel: 0.35, sustainPoint: 0.24 },
        },
    ]);
}
