import { TOEIC_BASIC_LESSONS_1_TO_50 } from './toeicBasicLessons.js';
import { ENGLISH_A1_BASIC_LESSONS_1_TO_50 } from './englishA1BasicLessons.js';

const EXAMPLE_OVERRIDES = {
    name: {
        example: 'Please write your name on the form.',
        example_vi: 'Vui lòng viết tên của bạn vào biểu mẫu.',
    },
    age: {
        example: 'Please write your age on the form.',
        example_vi: 'Vui lòng viết tuổi của bạn vào biểu mẫu.',
    },
    address: {
        example: 'Please write your address on the form.',
        example_vi: 'Vui lòng viết địa chỉ của bạn vào biểu mẫu.',
    },
    phone: {
        example: 'Please write your phone number on the form.',
        example_vi: 'Vui lòng viết số điện thoại của bạn vào biểu mẫu.',
    },
    email: {
        example: 'Please write your email address on the form.',
        example_vi: 'Vui lòng viết địa chỉ thư điện tử của bạn vào biểu mẫu.',
    },
    birthday: {
        example: 'Please write your birthday on the form.',
        example_vi: 'Vui lòng viết ngày sinh của bạn vào biểu mẫu.',
    },
    country: {
        example: 'Please write your country on the form.',
        example_vi: 'Vui lòng viết quốc gia của bạn vào biểu mẫu.',
    },
    city: {
        example: 'Please write your city on the form.',
        example_vi: 'Vui lòng viết thành phố của bạn vào biểu mẫu.',
    },
};

function makeExample(word, mean, wordtype) {
    const normalizedType = String(wordtype || '').toLowerCase();
    const normalizedWord = String(word || '').trim();
    const override = EXAMPLE_OVERRIDES[normalizedWord.toLowerCase()];
    if (override) {
        return override;
    }

    if (normalizedType.startsWith('v')) {
        return {
            example: `We ${normalizedWord} every day.`,
            example_vi: `Chúng tôi ${mean} mỗi ngày.`,
        };
    }

    if (normalizedType.startsWith('adj')) {
        return {
            example: `The room looks ${normalizedWord}.`,
            example_vi: `Căn phòng trông ${mean}.`,
        };
    }

    if (normalizedType.startsWith('adv')) {
        return {
            example: `She spoke ${normalizedWord}.`,
            example_vi: `Cô ấy nói chuyện ${mean}.`,
        };
    }

    if (normalizedType === 'phrase') {
        return {
            example: `We use "${normalizedWord}" in everyday English.`,
            example_vi: `Chúng tôi dùng "${mean}" trong tiếng Anh hằng ngày.`,
        };
    }

    return {
        example: `We talked about ${normalizedWord} today.`,
        example_vi: `Chúng tôi đã nói về ${mean} hôm nay.`,
    };
}

function makeWord(word, mean, wordtype) {
    const examples = makeExample(word, mean, wordtype);
    return {
        word,
        mean,
        wordtype,
        ...examples,
    };
}

const A2_EXTRA_LESSONS = [
    {
        title: 'Personal Information',
        words: [
            makeWord('name', 'tên', 'noun'),
            makeWord('age', 'tuổi', 'noun'),
            makeWord('address', 'địa chỉ', 'noun'),
            makeWord('phone', 'điện thoại', 'noun'),
            makeWord('email', 'thư điện tử', 'noun'),
            makeWord('birthday', 'ngày sinh', 'noun'),
            makeWord('country', 'quốc gia', 'noun'),
            makeWord('city', 'thành phố', 'noun'),
        ],
    },
    {
        title: 'Family & People',
        words: [
            makeWord('parent', 'cha mẹ', 'noun'),
            makeWord('child', 'đứa trẻ', 'noun'),
            makeWord('sibling', 'anh chị em', 'noun'),
            makeWord('brother', 'anh trai', 'noun'),
            makeWord('sister', 'chị gái', 'noun'),
            makeWord('cousin', 'anh chị em họ', 'noun'),
            makeWord('relative', 'người thân', 'noun'),
            makeWord('grandparent', 'ông bà', 'noun'),
        ],
    },
    {
        title: 'Home Rooms',
        words: [
            makeWord('kitchen', 'nhà bếp', 'noun'),
            makeWord('bedroom', 'phòng ngủ', 'noun'),
            makeWord('bathroom', 'phòng tắm', 'noun'),
            makeWord('living room', 'phòng khách', 'phrase'),
            makeWord('balcony', 'ban công', 'noun'),
            makeWord('hallway', 'hành lang', 'noun'),
            makeWord('garage', 'nhà để xe', 'noun'),
            makeWord('garden', 'khu vườn', 'noun'),
        ],
    },
    {
        title: 'Furniture',
        words: [
            makeWord('chair', 'ghế', 'noun'),
            makeWord('table', 'bàn', 'noun'),
            makeWord('sofa', 'ghế sofa', 'noun'),
            makeWord('shelf', 'kệ', 'noun'),
            makeWord('lamp', 'đèn', 'noun'),
            makeWord('mirror', 'gương', 'noun'),
            makeWord('carpet', 'tấm thảm', 'noun'),
            makeWord('bed', 'giường', 'noun'),
        ],
    },
    {
        title: 'Daily Routine',
        words: [
            makeWord('wake up', 'thức dậy', 'phrase'),
            makeWord('brush', 'đánh răng', 'verb'),
            makeWord('wash', 'rửa', 'verb'),
            makeWord('dress', 'mặc quần áo', 'verb'),
            makeWord('breakfast', 'bữa sáng', 'noun'),
            makeWord('commute', 'đi làm/đi học', 'verb'),
            makeWord('relax', 'thư giãn', 'verb'),
            makeWord('sleep', 'ngủ', 'verb'),
        ],
    },
    {
        title: 'Time & Days',
        words: [
            makeWord('morning', 'buổi sáng', 'noun'),
            makeWord('afternoon', 'buổi chiều', 'noun'),
            makeWord('evening', 'buổi tối', 'noun'),
            makeWord('tonight', 'tối nay', 'noun'),
            makeWord('yesterday', 'hôm qua', 'noun'),
            makeWord('tomorrow', 'ngày mai', 'noun'),
            makeWord('week', 'tuần', 'noun'),
            makeWord('month', 'tháng', 'noun'),
        ],
    },
    {
        title: 'Weather',
        words: [
            makeWord('sunny', 'nắng', 'adjective'),
            makeWord('rainy', 'mưa', 'adjective'),
            makeWord('cloudy', 'nhiều mây', 'adjective'),
            makeWord('windy', 'có gió', 'adjective'),
            makeWord('cold', 'lạnh', 'adjective'),
            makeWord('warm', 'ấm', 'adjective'),
            makeWord('hot', 'nóng', 'adjective'),
            makeWord('stormy', 'có bão', 'adjective'),
        ],
    },
    {
        title: 'Food',
        words: [
            makeWord('bread', 'bánh mì', 'noun'),
            makeWord('rice', 'cơm', 'noun'),
            makeWord('soup', 'súp', 'noun'),
            makeWord('salad', 'rau trộn', 'noun'),
            makeWord('fruit', 'trái cây', 'noun'),
            makeWord('chicken', 'thịt gà', 'noun'),
            makeWord('cheese', 'phô mai', 'noun'),
            makeWord('vegetable', 'rau củ', 'noun'),
        ],
    },
    {
        title: 'Drinks',
        words: [
            makeWord('water', 'nước', 'noun'),
            makeWord('milk', 'sữa', 'noun'),
            makeWord('tea', 'trà', 'noun'),
            makeWord('coffee', 'cà phê', 'noun'),
            makeWord('juice', 'nước ép', 'noun'),
            makeWord('soda', 'nước ngọt', 'noun'),
            makeWord('beer', 'bia', 'noun'),
            makeWord('wine', 'rượu vang', 'noun'),
        ],
    },
    {
        title: 'Shopping',
        words: [
            makeWord('price', 'giá', 'noun'),
            makeWord('money', 'tiền', 'noun'),
            makeWord('store', 'cửa hàng', 'noun'),
            makeWord('bill', 'hóa đơn', 'noun'),
            makeWord('size', 'kích cỡ', 'noun'),
            makeWord('color', 'màu sắc', 'noun'),
            makeWord('bargain', 'món hời', 'noun'),
            makeWord('checkout', 'thanh toán', 'noun'),
        ],
    },
    {
        title: 'Clothing',
        words: [
            makeWord('shirt', 'áo sơ mi', 'noun'),
            makeWord('pants', 'quần dài', 'noun'),
            makeWord('skirt', 'váy', 'noun'),
            makeWord('dress', 'váy liền', 'noun'),
            makeWord('shoes', 'giày', 'noun'),
            makeWord('socks', 'tất', 'noun'),
            makeWord('jacket', 'áo khoác', 'noun'),
            makeWord('sweater', 'áo len', 'noun'),
        ],
    },
    {
        title: 'Travel',
        words: [
            makeWord('ticket', 'vé', 'noun'),
            makeWord('passport', 'hộ chiếu', 'noun'),
            makeWord('baggage', 'hành lý', 'noun'),
            makeWord('airport', 'sân bay', 'noun'),
            makeWord('hotel', 'khách sạn', 'noun'),
            makeWord('journey', 'chuyến đi', 'noun'),
            makeWord('map', 'bản đồ', 'noun'),
            makeWord('route', 'tuyến đường', 'noun'),
        ],
    },
    {
        title: 'Transport',
        words: [
            makeWord('bus', 'xe buýt', 'noun'),
            makeWord('train', 'tàu hỏa', 'noun'),
            makeWord('taxi', 'taxi', 'noun'),
            makeWord('bike', 'xe đạp', 'noun'),
            makeWord('car', 'ô tô', 'noun'),
            makeWord('subway', 'tàu điện ngầm', 'noun'),
            makeWord('station', 'ga', 'noun'),
            makeWord('platform', 'sân ga', 'noun'),
        ],
    },
    {
        title: 'School',
        words: [
            makeWord('teacher', 'giáo viên', 'noun'),
            makeWord('student', 'học sinh', 'noun'),
            makeWord('lesson', 'bài học', 'noun'),
            makeWord('homework', 'bài tập về nhà', 'noun'),
            makeWord('exam', 'kỳ thi', 'noun'),
            makeWord('notebook', 'vở', 'noun'),
            makeWord('classroom', 'phòng học', 'noun'),
            makeWord('subject', 'môn học', 'noun'),
        ],
    },
    {
        title: 'Work',
        words: [
            makeWord('office', 'văn phòng', 'noun'),
            makeWord('colleague', 'đồng nghiệp', 'noun'),
            makeWord('manager', 'quản lý', 'noun'),
            makeWord('meeting', 'cuộc họp', 'noun'),
            makeWord('deadline', 'hạn chót', 'noun'),
            makeWord('project', 'dự án', 'noun'),
            makeWord('report', 'báo cáo', 'noun'),
            makeWord('client', 'khách hàng', 'noun'),
        ],
    },
    {
        title: 'Health',
        words: [
            makeWord('doctor', 'bác sĩ', 'noun'),
            makeWord('dentist', 'nha sĩ', 'noun'),
            makeWord('pharmacy', 'hiệu thuốc', 'noun'),
            makeWord('medicine', 'thuốc', 'noun'),
            makeWord('fever', 'sốt', 'noun'),
            makeWord('pain', 'đau', 'noun'),
            makeWord('cough', 'ho', 'noun'),
            makeWord('rest', 'nghỉ ngơi', 'noun'),
        ],
    },
    {
        title: 'Body Parts',
        words: [
            makeWord('head', 'đầu', 'noun'),
            makeWord('hand', 'tay', 'noun'),
            makeWord('leg', 'chân', 'noun'),
            makeWord('arm', 'cánh tay', 'noun'),
            makeWord('eye', 'mắt', 'noun'),
            makeWord('ear', 'tai', 'noun'),
            makeWord('mouth', 'miệng', 'noun'),
            makeWord('stomach', 'bụng', 'noun'),
        ],
    },
    {
        title: 'Feelings',
        words: [
            makeWord('happy', 'vui vẻ', 'adjective'),
            makeWord('sad', 'buồn', 'adjective'),
            makeWord('angry', 'tức giận', 'adjective'),
            makeWord('nervous', 'lo lắng', 'adjective'),
            makeWord('tired', 'mệt', 'adjective'),
            makeWord('excited', 'phấn khích', 'adjective'),
            makeWord('worried', 'lo lắng', 'adjective'),
            makeWord('calm', 'bình tĩnh', 'adjective'),
        ],
    },
    {
        title: 'Hobbies',
        words: [
            makeWord('reading', 'đọc sách', 'verb'),
            makeWord('gardening', 'làm vườn', 'verb'),
            makeWord('painting', 'vẽ tranh', 'verb'),
            makeWord('dancing', 'nhảy múa', 'verb'),
            makeWord('singing', 'hát', 'verb'),
            makeWord('swimming', 'bơi lội', 'verb'),
            makeWord('camping', 'cắm trại', 'verb'),
            makeWord('cooking', 'nấu ăn', 'verb'),
        ],
    },
    {
        title: 'Entertainment',
        words: [
            makeWord('movie', 'phim', 'noun'),
            makeWord('music', 'âm nhạc', 'noun'),
            makeWord('game', 'trò chơi', 'noun'),
            makeWord('concert', 'buổi hòa nhạc', 'noun'),
            makeWord('theater', 'rạp hát', 'noun'),
            makeWord('show', 'buổi biểu diễn', 'noun'),
            makeWord('book', 'sách', 'noun'),
            makeWord('episode', 'tập phim', 'noun'),
        ],
    },
    {
        title: 'City Life',
        words: [
            makeWord('street', 'phố', 'noun'),
            makeWord('bridge', 'cây cầu', 'noun'),
            makeWord('park', 'công viên', 'noun'),
            makeWord('museum', 'bảo tàng', 'noun'),
            makeWord('market', 'chợ', 'noun'),
            makeWord('bank', 'ngân hàng', 'noun'),
            makeWord('library', 'thư viện', 'noun'),
            makeWord('square', 'quảng trường', 'noun'),
        ],
    },
    {
        title: 'Directions',
        words: [
            makeWord('left', 'bên trái', 'adjective'),
            makeWord('right', 'bên phải', 'adjective'),
            makeWord('straight', 'thẳng', 'adjective'),
            makeWord('corner', 'góc', 'noun'),
            makeWord('near', 'gần', 'adjective'),
            makeWord('far', 'xa', 'adjective'),
            makeWord('north', 'phía bắc', 'noun'),
            makeWord('south', 'phía nam', 'noun'),
        ],
    },
    {
        title: 'Communication',
        words: [
            makeWord('call', 'gọi điện', 'verb'),
            makeWord('text', 'nhắn tin', 'verb'),
            makeWord('email', 'gửi email', 'verb'),
            makeWord('message', 'tin nhắn', 'noun'),
            makeWord('reply', 'trả lời', 'verb'),
            makeWord('ask', 'hỏi', 'verb'),
            makeWord('answer', 'trả lời', 'verb'),
            makeWord('explain', 'giải thích', 'verb'),
        ],
    },
    {
        title: 'Computers',
        words: [
            makeWord('keyboard', 'bàn phím', 'noun'),
            makeWord('screen', 'màn hình', 'noun'),
            makeWord('mouse', 'chuột máy tính', 'noun'),
            makeWord('file', 'tệp', 'noun'),
            makeWord('folder', 'thư mục', 'noun'),
            makeWord('upload', 'tải lên', 'verb'),
            makeWord('download', 'tải xuống', 'verb'),
            makeWord('password', 'mật khẩu', 'noun'),
        ],
    },
    {
        title: 'Internet',
        words: [
            makeWord('website', 'trang web', 'noun'),
            makeWord('search', 'tìm kiếm', 'verb'),
            makeWord('online', 'trực tuyến', 'adjective'),
            makeWord('account', 'tài khoản', 'noun'),
            makeWord('login', 'đăng nhập', 'verb'),
            makeWord('post', 'đăng bài', 'verb'),
            makeWord('share', 'chia sẻ', 'verb'),
            makeWord('comment', 'bình luận', 'noun'),
        ],
    },
    {
        title: 'Nature',
        words: [
            makeWord('tree', 'cây', 'noun'),
            makeWord('flower', 'hoa', 'noun'),
            makeWord('river', 'sông', 'noun'),
            makeWord('mountain', 'núi', 'noun'),
            makeWord('beach', 'bãi biển', 'noun'),
            makeWord('forest', 'rừng', 'noun'),
            makeWord('lake', 'hồ', 'noun'),
            makeWord('field', 'cánh đồng', 'noun'),
        ],
    },
    {
        title: 'Animals',
        words: [
            makeWord('dog', 'chó', 'noun'),
            makeWord('cat', 'mèo', 'noun'),
            makeWord('bird', 'chim', 'noun'),
            makeWord('fish', 'cá', 'noun'),
            makeWord('horse', 'ngựa', 'noun'),
            makeWord('cow', 'bò', 'noun'),
            makeWord('rabbit', 'thỏ', 'noun'),
            makeWord('turtle', 'rùa', 'noun'),
        ],
    },
    {
        title: 'Kitchen Actions',
        words: [
            makeWord('cook', 'nấu', 'verb'),
            makeWord('bake', 'nướng', 'verb'),
            makeWord('boil', 'luộc', 'verb'),
            makeWord('fry', 'rán', 'verb'),
            makeWord('chop', 'chặt/cắt nhỏ', 'verb'),
            makeWord('mix', 'trộn', 'verb'),
            makeWord('stir', 'khuấy', 'verb'),
            makeWord('serve', 'phục vụ', 'verb'),
        ],
    },
    {
        title: 'House Chores',
        words: [
            makeWord('clean', 'dọn dẹp', 'verb'),
            makeWord('sweep', 'quét', 'verb'),
            makeWord('dust', 'lau bụi', 'verb'),
            makeWord('iron', 'ủi', 'verb'),
            makeWord('fold', 'gấp', 'verb'),
            makeWord('repair', 'sửa chữa', 'verb'),
            makeWord('tidy', 'ngăn nắp', 'adjective'),
            makeWord('wash', 'giặt/rửa', 'verb'),
        ],
    },
    {
        title: 'Money',
        words: [
            makeWord('save', 'tiết kiệm', 'verb'),
            makeWord('spend', 'chi tiêu', 'verb'),
            makeWord('cost', 'tốn', 'verb'),
            makeWord('cheap', 'rẻ', 'adjective'),
            makeWord('expensive', 'đắt', 'adjective'),
            makeWord('salary', 'lương', 'noun'),
            makeWord('pay', 'trả tiền', 'verb'),
            makeWord('change', 'tiền lẻ', 'noun'),
        ],
    },
    {
        title: 'Safety',
        words: [
            makeWord('safe', 'an toàn', 'adjective'),
            makeWord('danger', 'nguy hiểm', 'noun'),
            makeWord('police', 'cảnh sát', 'noun'),
            makeWord('fire', 'lửa', 'noun'),
            makeWord('emergency', 'khẩn cấp', 'noun'),
            makeWord('helmet', 'mũ bảo hiểm', 'noun'),
            makeWord('seatbelt', 'dây an toàn', 'noun'),
            makeWord('alarm', 'chuông báo động', 'noun'),
        ],
    },
    {
        title: 'Holidays',
        words: [
            makeWord('holiday', 'kỳ nghỉ', 'noun'),
            makeWord('festival', 'lễ hội', 'noun'),
            makeWord('present', 'quà tặng', 'noun'),
            makeWord('party', 'bữa tiệc', 'noun'),
            makeWord('celebration', 'lễ kỷ niệm', 'noun'),
            makeWord('card', 'thiệp', 'noun'),
            makeWord('gift', 'món quà', 'noun'),
            makeWord('invite', 'mời', 'verb'),
        ],
    },
    {
        title: 'Social Life',
        words: [
            makeWord('friend', 'bạn bè', 'noun'),
            makeWord('neighbor', 'hàng xóm', 'noun'),
            makeWord('guest', 'khách', 'noun'),
            makeWord('host', 'chủ nhà', 'noun'),
            makeWord('group', 'nhóm', 'noun'),
            makeWord('team', 'đội', 'noun'),
            makeWord('partner', 'đối tác', 'noun'),
            makeWord('community', 'cộng đồng', 'noun'),
        ],
    },
    {
        title: 'Shopping Items',
        words: [
            makeWord('basket', 'giỏ', 'noun'),
            makeWord('cart', 'xe đẩy', 'noun'),
            makeWord('receipt', 'biên lai', 'noun'),
            makeWord('label', 'nhãn', 'noun'),
            makeWord('discount', 'giảm giá', 'noun'),
            makeWord('order', 'đơn hàng', 'noun'),
            makeWord('delivery', 'giao hàng', 'noun'),
            makeWord('return', 'trả lại', 'verb'),
        ],
    },
    {
        title: 'Sports',
        words: [
            makeWord('run', 'chạy', 'verb'),
            makeWord('walk', 'đi bộ', 'verb'),
            makeWord('jump', 'nhảy', 'verb'),
            makeWord('swim', 'bơi', 'verb'),
            makeWord('play', 'chơi', 'verb'),
            makeWord('score', 'ghi điểm', 'verb'),
            makeWord('coach', 'huấn luyện viên', 'noun'),
            makeWord('team', 'đội', 'noun'),
        ],
    },
    {
        title: 'Outdoors',
        words: [
            makeWord('picnic', 'dã ngoại', 'noun'),
            makeWord('hike', 'đi bộ đường dài', 'verb'),
            makeWord('camp', 'cắm trại', 'verb'),
            makeWord('climb', 'leo', 'verb'),
            makeWord('explore', 'khám phá', 'verb'),
            makeWord('travel', 'du lịch', 'verb'),
            makeWord('enjoy', 'tận hưởng', 'verb'),
            makeWord('relax', 'thư giãn', 'verb'),
        ],
    },
    {
        title: 'Office Technology',
        words: [
            makeWord('printer', 'máy in', 'noun'),
            makeWord('scanner', 'máy quét', 'noun'),
            makeWord('copier', 'máy photocopy', 'noun'),
            makeWord('charger', 'bộ sạc', 'noun'),
            makeWord('cable', 'cáp', 'noun'),
            makeWord('device', 'thiết bị', 'noun'),
            makeWord('software', 'phần mềm', 'noun'),
            makeWord('update', 'cập nhật', 'verb'),
        ],
    },
    {
        title: 'Finance',
        words: [
            makeWord('bank', 'ngân hàng', 'noun'),
            makeWord('account', 'tài khoản', 'noun'),
            makeWord('card', 'thẻ', 'noun'),
            makeWord('cash', 'tiền mặt', 'noun'),
            makeWord('loan', 'khoản vay', 'noun'),
            makeWord('debt', 'nợ', 'noun'),
            makeWord('budget', 'ngân sách', 'noun'),
            makeWord('savings', 'tiền tiết kiệm', 'noun'),
        ],
    },
    {
        title: 'Public Places',
        words: [
            makeWord('restaurant', 'nhà hàng', 'noun'),
            makeWord('cafe', 'quán cà phê', 'noun'),
            makeWord('hospital', 'bệnh viện', 'noun'),
            makeWord('station', 'ga', 'noun'),
            makeWord('post office', 'bưu điện', 'phrase'),
            makeWord('supermarket', 'siêu thị', 'noun'),
            makeWord('school', 'trường học', 'noun'),
            makeWord('library', 'thư viện', 'noun'),
        ],
    },
    {
        title: 'Services',
        words: [
            makeWord('repair', 'sửa chữa', 'verb'),
            makeWord('rent', 'thuê', 'verb'),
            makeWord('book', 'đặt chỗ', 'verb'),
            makeWord('reserve', 'đặt trước', 'verb'),
            makeWord('cancel', 'hủy', 'verb'),
            makeWord('provide', 'cung cấp', 'verb'),
            makeWord('support', 'hỗ trợ', 'verb'),
            makeWord('delivery', 'giao hàng', 'noun'),
        ],
    },
    {
        title: 'Language Learning',
        words: [
            makeWord('word', 'từ', 'noun'),
            makeWord('phrase', 'cụm từ', 'noun'),
            makeWord('sentence', 'câu', 'noun'),
            makeWord('grammar', 'ngữ pháp', 'noun'),
            makeWord('meaning', 'nghĩa', 'noun'),
            makeWord('pronunciation', 'phát âm', 'noun'),
            makeWord('spelling', 'chính tả', 'noun'),
            makeWord('dialogue', 'đối thoại', 'noun'),
        ],
    },
    {
        title: 'Environment',
        words: [
            makeWord('recycle', 'tái chế', 'verb'),
            makeWord('waste', 'rác thải', 'noun'),
            makeWord('energy', 'năng lượng', 'noun'),
            makeWord('pollution', 'ô nhiễm', 'noun'),
            makeWord('protect', 'bảo vệ', 'verb'),
            makeWord('nature', 'thiên nhiên', 'noun'),
            makeWord('paper', 'giấy', 'noun'),
            makeWord('plastic', 'nhựa', 'noun'),
        ],
    },
    {
        title: 'Government & Society',
        words: [
            makeWord('citizen', 'công dân', 'noun'),
            makeWord('law', 'luật', 'noun'),
            makeWord('vote', 'bỏ phiếu', 'verb'),
            makeWord('tax', 'thuế', 'noun'),
            makeWord('permit', 'giấy phép', 'noun'),
            makeWord('license', 'giấy phép', 'noun'),
            makeWord('public', 'công cộng', 'adjective'),
            makeWord('service', 'dịch vụ', 'noun'),
        ],
    },
    {
        title: 'Study Skills',
        words: [
            makeWord('practice', 'luyện tập', 'verb'),
            makeWord('review', 'ôn lại', 'verb'),
            makeWord('memorize', 'ghi nhớ', 'verb'),
            makeWord('repeat', 'lặp lại', 'verb'),
            makeWord('check', 'kiểm tra', 'verb'),
            makeWord('improve', 'cải thiện', 'verb'),
            makeWord('listen', 'nghe', 'verb'),
            makeWord('speak', 'nói', 'verb'),
        ],
    },
    {
        title: 'Social Media',
        words: [
            makeWord('profile', 'hồ sơ', 'noun'),
            makeWord('follow', 'theo dõi', 'verb'),
            makeWord('like', 'thích', 'verb'),
            makeWord('upload', 'tải lên', 'verb'),
            makeWord('scroll', 'cuộn', 'verb'),
            makeWord('comment', 'bình luận', 'noun'),
            makeWord('share', 'chia sẻ', 'verb'),
            makeWord('post', 'bài đăng', 'noun'),
        ],
    },
    {
        title: 'Travel Abroad',
        words: [
            makeWord('visa', 'thị thực', 'noun'),
            makeWord('customs', 'hải quan', 'noun'),
            makeWord('suitcase', 'vali', 'noun'),
            makeWord('souvenir', 'quà lưu niệm', 'noun'),
            makeWord('guide', 'hướng dẫn viên', 'noun'),
            makeWord('exchange', 'đổi tiền', 'verb'),
            makeWord('departure', 'khởi hành', 'noun'),
            makeWord('arrival', 'đến nơi', 'noun'),
        ],
    },
    {
        title: 'Seasons',
        words: [
            makeWord('spring', 'mùa xuân', 'noun'),
            makeWord('summer', 'mùa hè', 'noun'),
            makeWord('autumn', 'mùa thu', 'noun'),
            makeWord('winter', 'mùa đông', 'noun'),
            makeWord('season', 'mùa', 'noun'),
            makeWord('temperature', 'nhiệt độ', 'noun'),
            makeWord('climate', 'khí hậu', 'noun'),
            makeWord('sunrise', 'bình minh', 'noun'),
        ],
    },
    {
        title: 'General Adjectives',
        words: [
            makeWord('useful', 'hữu ích', 'adjective'),
            makeWord('simple', 'đơn giản', 'adjective'),
            makeWord('common', 'phổ biến', 'adjective'),
            makeWord('careful', 'cẩn thận', 'adjective'),
            makeWord('polite', 'lịch sự', 'adjective'),
            makeWord('friendly', 'thân thiện', 'adjective'),
            makeWord('healthy', 'khỏe mạnh', 'adjective'),
            makeWord('safe', 'an toàn', 'adjective'),
        ],
    },
    {
        title: 'Daily Objects',
        words: [
            makeWord('pen', 'bút bi', 'noun'),
            makeWord('pencil', 'bút chì', 'noun'),
            makeWord('notebook', 'vở', 'noun'),
            makeWord('bag', 'cặp', 'noun'),
            makeWord('clock', 'đồng hồ', 'noun'),
            makeWord('key', 'chìa khóa', 'noun'),
            makeWord('wallet', 'ví tiền', 'noun'),
            makeWord('phone', 'điện thoại', 'noun'),
        ],
    },
    {
        title: 'Common Actions',
        words: [
            makeWord('open', 'mở', 'verb'),
            makeWord('close', 'đóng', 'verb'),
            makeWord('start', 'bắt đầu', 'verb'),
            makeWord('finish', 'kết thúc', 'verb'),
            makeWord('buy', 'mua', 'verb'),
            makeWord('sell', 'bán', 'verb'),
            makeWord('wait', 'chờ', 'verb'),
            makeWord('help', 'giúp đỡ', 'verb'),
        ],
    },
];

const A2_LESSON_TITLES = [
    'Personal Information',
    'Family & People',
    'Home Rooms',
    'Furniture',
    'Daily Routine',
    'Time & Days',
    'Weather',
    'Food',
    'Drinks',
    'Shopping',
    'Clothing',
    'Travel',
    'Transport',
    'School',
    'Work',
    'Health',
    'Body Parts',
    'Feelings',
    'Hobbies',
    'Entertainment',
    'City Life',
    'Directions',
    'Communication',
    'Computers',
    'Internet',
    'Nature',
    'Animals',
    'Kitchen Actions',
    'House Chores',
    'Money',
    'Safety',
    'Holidays',
    'Social Life',
    'Shopping Items',
    'Sports',
    'Outdoors',
    'Office Technology',
    'Finance',
    'Public Places',
    'Services',
    'Language Learning',
    'Environment',
    'Government & Society',
    'Study Skills',
    'Social Media',
    'Travel Abroad',
    'Seasons',
    'Everyday Communication',
    'Daily Objects',
    'General Adjectives',
];

function mergeLessonWords(index) {
    const a1Words = ENGLISH_A1_BASIC_LESSONS_1_TO_50[index]?.words || [];
    const toeicWords = TOEIC_BASIC_LESSONS_1_TO_50[index]?.words || [];
    const extraWords = A2_EXTRA_LESSONS[index]?.words || [];
    return [...a1Words, ...toeicWords, ...extraWords];
}

export const ENGLISH_A2_BASIC_LESSONS_1_TO_50 = A2_LESSON_TITLES.map((title, index) => ({
    id: `english-a2-lesson-${index + 1}`,
    slug: `english-a2-lesson-${index + 1}`,
    title: `Lesson ${index + 1}: ${title}`,
    description: `Từ vựng tiếng Anh A2 cơ bản theo chủ đề ${title.toLowerCase()}.`,
    sortOrder: index + 1,
    wordCount: mergeLessonWords(index).length,
    vocabularyCount: mergeLessonWords(index).length,
    words: mergeLessonWords(index),
}));
