import { CharacterAnalysisResult } from '../services/geminiService';

export const DEFAULT_OFFLINE_CHARACTERS: Record<string, CharacterAnalysisResult> = {
  "好": {
    character: "好",
    pinyin: "hǎo",
    sinoVietnamese: "Hảo",
    vietnameseMeaning: "Tốt, đẹp, hay, thân thiện",
    totalStrokes: 6,
    strokeSequenceInstructions: [
      "Nét 1: Phẩy chấm (bên trái bộ Nữ)",
      "Nét 2: Phẩy",
      "Nét 3: Hất",
      "Nét 4: Ngang móc (đầu bộ Tử)",
      "Nét 5: Cong móc",
      "Nét 6: Ngang dài cắt qua"
    ],
    radicals: [
      {
        radical: "女",
        pinyin: "nǚ",
        sinoVietnamese: "Nữ",
        meaning: "Người phụ nữ, người mẹ",
        description: "Nằm bên trái, tượng trưng cho người mẹ dịu hiền gánh vác việc gia đình"
      },
      {
        radical: "子",
        pinyin: "zǐ",
        sinoVietnamese: "Tử",
        meaning: "Đứa con, con trẻ",
        description: "Nằm bên phải; người mẹ hiền bên cạnh đứa con ngoan là hình ảnh tốt đẹp, viên mãn nhất"
      }
    ],
    composition: "Chữ Hội Ý kết cấu Trái-Phải. Bên trái là bộ Nữ (女), bên phải là bộ Tử (子). Người xưa quan niệm người phụ nữ sinh được con cái vuông tròn, gia đình êm ấm hòa thuận chính là điều tốt lành, phúc đức nhất thiên hạ.",
    examples: [
      { word: "你好", pinyin: "nǐ hǎo", meaning: "Xin chào bạn" },
      { word: "好看", pinyin: "hǎokàn", meaning: "Đẹp mắt, ưa nhìn" },
      { word: "好处", pinyin: "hǎochu", meaning: "Lợi ích, điểm tốt" }
    ]
  },
  "家": {
    character: "家",
    pinyin: "jiā",
    sinoVietnamese: "Gia",
    vietnameseMeaning: "Nhà, gia đình, quê hương",
    totalStrokes: 10,
    strokeSequenceInstructions: [
      "Nét 1: Chấm trên đỉnh",
      "Nét 2: Chấm trái",
      "Nét 3: Ngang móc tạo mái nhà",
      "Nét 4: Phẩy ngắn",
      "Nét 5: Cong móc",
      "Nét 6: Phẩy ngắn",
      "Nét 7: Phẩy dài",
      "Nét 8: Phẩy",
      "Nét 9: Mác sang phải",
      "Nét 10: Phẩy ngắn cuối"
    ],
    radicals: [
      {
        radical: "宀",
        pinyin: "mián",
        sinoVietnamese: "Miên",
        meaning: "Mái nhà che mưa nắng",
        description: "Bộ Miên phía trên biểu thị không gian ngôi nhà che chở cho các thành viên"
      },
      {
        radical: "豕",
        pinyin: "shǐ",
        sinoVietnamese: "Thỉ",
        meaning: "Con heo (lợn)",
        description: "Thời xưa dưới mái nhà có nuôi gia súc ấm no biểu trưng cho sự sung túc, định cư"
      }
    ],
    composition: "Chữ Hội Ý kết cấu Trên-Dưới. Phía trên là bộ Miên (宀 - mái nhà), phía dưới là bộ Thỉ (豕 - con lợn). Thời cổ đại nông nghiệp, có nơi che mưa nắng và có gia súc nuôi dưỡng thì mới định cư lập nghiệp, hình thành nên mái ấm gia đình.",
    examples: [
      { word: "大家", pinyin: "dàjiā", meaning: "Mọi người, tất cả mọi người" },
      { word: "家庭", pinyin: "jiātíng", meaning: "Gia đình" },
      { word: "回家", pinyin: "huí jiā", meaning: "Về nhà" }
    ]
  },
  "学": {
    character: "学",
    pinyin: "xué",
    sinoVietnamese: "Học",
    vietnameseMeaning: "Học tập, bắt chước, tri thức",
    totalStrokes: 8,
    strokeSequenceInstructions: [
      "Nét 1: Chấm trái",
      "Nét 2: Phẩy giữa",
      "Nét 3: Phẩy phải",
      "Nét 4: Chấm bên trái mui",
      "Nét 5: Ngang móc",
      "Nét 6: Ngang móc (chữ Tử)",
      "Nét 7: Cong móc",
      "Nét 8: Ngang"
    ],
    radicals: [
      {
        radical: "子",
        pinyin: "zǐ",
        sinoVietnamese: "Tử",
        meaning: "Đứa trẻ, con cái",
        description: "Nằm phía dưới, biểu thị đối tượng người học trò cần được dạy dỗ và rèn luyện"
      },
      {
        radical: "冖",
        pinyin: "mì",
        sinoVietnamese: "Mịch",
        meaning: "Mái che, trùm khăn",
        description: "Tượng trưng cho trường lớp, mái hiên nơi truyền dạy tri thức"
      }
    ],
    composition: "Chữ Hội Ý kết cấu Trên-Dưới. Phía trên là hình tượng đôi tay nâng đỡ tri thức khai sáng dưới mái hiên, phía dưới là chữ Tử (子 - đứa trẻ) chăm chú tiếp thu đạo lý để thành người.",
    examples: [
      { word: "学习", pinyin: "xuéxí", meaning: "Học tập, rèn luyện" },
      { word: "学生", pinyin: "xuésheng", meaning: "Học sinh, sinh viên" },
      { word: "大学", pinyin: "dàxué", meaning: "Đại học" }
    ]
  },
  "国": {
    character: "国",
    pinyin: "guó",
    sinoVietnamese: "Quốc",
    vietnameseMeaning: "Đất nước, quốc gia",
    totalStrokes: 8,
    strokeSequenceInstructions: [
      "Nét 1: Sổ đứng thành viền trái",
      "Nét 2: Ngang gập thành viền trên và phải",
      "Nét 3: Ngang trên (chữ Ngọc)",
      "Nét 4: Sổ đứng",
      "Nét 5: Ngang giữa",
      "Nét 6: Ngang đáy chữ Ngọc",
      "Nét 7: Chấm góc dưới",
      "Nét 8: Ngang đóng khung viền đáy"
    ],
    radicals: [
      {
        radical: "囗",
        pinyin: "wéi",
        sinoVietnamese: "Vi",
        meaning: "Vây quanh, biên giới",
        description: "Bao quanh bên ngoài biểu thị đường biên giới bờ cõi lãnh thổ vững chắc"
      },
      {
        radical: "玉",
        pinyin: "yù",
        sinoVietnamese: "Ngọc",
        meaning: "Viên ngọc quý",
        description: "Nằm bên trong biểu thị của cải, con người và báu vật thiêng liêng cần giữ gìn"
      }
    ],
    composition: "Chữ Hội Ý kết cấu Toàn Bao Quanh. Khung thành viền ngoài là bộ Vi (囗) thể hiện biên cương bờ cõi, bên trong ôm trọn viên Ngọc (玉) biểu trưng cho tài nguyên, bảo vật và nhân dân quý báu của non sông.",
    examples: [
      { word: "国家", pinyin: "guójiā", meaning: "Quốc gia, đất nước" },
      { word: "中国", pinyin: "zhōngguó", meaning: "Trung Quốc" },
      { word: "出国", pinyin: "chū guó", meaning: "Xuất ngoại, ra nước ngoài" }
    ]
  },
  "想": {
    character: "想",
    pinyin: "xiǎng",
    sinoVietnamese: "Tưởng",
    vietnameseMeaning: "Nghĩ, nhớ, muốn, suy ngẫm",
    totalStrokes: 13,
    strokeSequenceInstructions: [
      "Nét 1: Ngang (bộ Mộc)",
      "Nét 2: Sổ",
      "Nét 3: Phẩy",
      "Nét 4: Chấm",
      "Nét 5: Sổ (bộ Mục)",
      "Nét 6: Ngang gập",
      "Nét 7: Ngang",
      "Nét 8: Ngang",
      "Nét 9: Ngang đáy",
      "Nét 10: Chấm trái (bộ Tâm)",
      "Nét 11: Nằm móc",
      "Nét 12: Chấm giữa",
      "Nét 13: Chấm phải"
    ],
    radicals: [
      {
        radical: "心",
        pinyin: "xīn",
        sinoVietnamese: "Tâm",
        meaning: "Trái tim, tâm tư",
        description: "Nằm ở dưới đáy, biểu thị mọi suy tư, trăn trở đều phát xuất từ đáy lòng"
      },
      {
        radical: "相",
        pinyin: "xiāng",
        sinoVietnamese: "Tương",
        meaning: "Tương hỗ, nhìn ngắm",
        description: "Nằm ở trên, vừa tạo âm đọc vừa gợi hình ảnh quan sát ghi nhớ sự vật"
      }
    ],
    composition: "Chữ Hình Thanh kết cấu Trên-Dưới. Phía trên là chữ Tương (相 - gồm Mộc và Mục: mắt quan sát cây cỏ), phía dưới là bộ Tâm (心). Hình ảnh mắt nhìn ghi nhận hình bóng rồi đưa vào đáy lòng suy tư chính là ý nghĩa của chữ Tưởng (Nghĩ, Nhớ).",
    examples: [
      { word: "想法", pinyin: "xiǎngfǎ", meaning: "Ý kiến, suy nghĩ" },
      { word: "想念", pinyin: "xiǎngniàn", meaning: "Tưởng nhớ, nhớ nhung" },
      { word: "想去", pinyin: "xiǎng qù", meaning: "Muốn đi" }
    ]
  },
  "美": {
    character: "美",
    pinyin: "měi",
    sinoVietnamese: "Mỹ",
    vietnameseMeaning: "Đẹp, hoàn mỹ, thơm tho",
    totalStrokes: 9,
    strokeSequenceInstructions: [
      "Nét 1: Chấm",
      "Nét 2: Phẩy",
      "Nét 3: Ngang ngắn",
      "Nét 4: Ngang ngắn",
      "Nét 5: Sổ",
      "Nét 6: Ngang giữa",
      "Nét 7: Ngang dài",
      "Nét 8: Phẩy dài",
      "Nét 9: Mác"
    ],
    radicals: [
      {
        radical: "羊",
        pinyin: "yáng",
        sinoVietnamese: "Dương",
        meaning: "Con dê, con cừu",
        description: "Phần trên là hình ảnh loài cừu hiền hòa, biểu tượng của cát tường phúc đức"
      },
      {
        radical: "大",
        pinyin: "dà",
        sinoVietnamese: "Đại",
        meaning: "To lớn, thịnh vượng",
        description: "Phần dưới biểu thị sự đẫy đà, sinh trưởng nở nang viên mãn"
      }
    ],
    composition: "Chữ Hội Ý kết cấu Trên-Dưới. Cắt nghĩa từ Dương (羊 - cừu) và Đại (大 - to lớn). Trong văn hóa Á Đông thuở sơ khai, cừu to béo vừa thể hiện ẩm thực ngọt lành dồi dào vừa là chuẩn mực của sự hoàn mỹ, tươi đẹp.",
    examples: [
      { word: "美丽", pinyin: "měilì", meaning: "Xinh đẹp, lộng lẫy" },
      { word: "美好", pinyin: "měihǎo", meaning: "Tốt đẹp" },
      { word: "美食", pinyin: "měishí", meaning: "Món ăn ngon, ẩm thực" }
    ]
  },
  "明": {
    character: "明",
    pinyin: "míng",
    sinoVietnamese: "Minh",
    vietnameseMeaning: "Sáng sủa, quang minh, rõ ràng",
    totalStrokes: 8,
    strokeSequenceInstructions: [
      "Nét 1: Sổ đứng (chữ Nhật)",
      "Nét 2: Ngang gập",
      "Nét 3: Ngang giữa",
      "Nét 4: Ngang đáy",
      "Nét 5: Phẩy (chữ Nguyệt)",
      "Nét 6: Ngang gập móc",
      "Nét 7: Ngang",
      "Nét 8: Ngang"
    ],
    radicals: [
      {
        radical: "日",
        pinyin: "rì",
        sinoVietnamese: "Nhật",
        meaning: "Mặt trời, ban ngày",
        description: "Nằm bên trái, nguồn phát quang rực rỡ ban ngày"
      },
      {
        radical: "月",
        pinyin: "yuè",
        sinoVietnamese: "Nguyệt",
        meaning: "Mặt trăng, ban đêm",
        description: "Nằm bên phải, nguồn sáng thanh tao vằng vặc ban đêm"
      }
    ],
    composition: "Chữ Hội Ý kết cấu Trái-Phải. Hai vầng tinh tú sáng nhất vũ trụ là Mặt trời (Nhật - 日) và Mặt trăng (Nguyệt - 月) cùng đứng chung một thể, tạo ra nguồn sáng vô tận xua tan bóng tối, mang nghĩa quang minh, sáng tỏ.",
    examples: [
      { word: "明天", pinyin: "míngtiān", meaning: "Ngày mai" },
      { word: "聪明", pinyin: "cōngmíng", meaning: "Thông minh" },
      { word: "明白", pinyin: "míngbai", meaning: "Hiểu rõ, tường tận" }
    ]
  },
  "安": {
    character: "安",
    pinyin: "ān",
    sinoVietnamese: "An",
    vietnameseMeaning: "Bình an, an toàn, yên ổn",
    totalStrokes: 6,
    strokeSequenceInstructions: [
      "Nét 1: Chấm trên đỉnh (bộ Miên)",
      "Nét 2: Chấm trái",
      "Nét 3: Ngang móc",
      "Nét 4: Phẩy (bộ Nữ)",
      "Nét 5: Cong hất",
      "Nét 6: Ngang dài"
    ],
    radicals: [
      {
        radical: "宀",
        pinyin: "mián",
        sinoVietnamese: "Miên",
        meaning: "Mái nhà che chở",
        description: "Biểu tượng mái nhà vững chãi bảo vệ trước giông gió"
      },
      {
        radical: "女",
        pinyin: "nǚ",
        sinoVietnamese: "Nữ",
        meaning: "Người phụ nữ",
        description: "Người phụ nữ hiền lành tề gia nội trợ tạo dựng nề nếp yên vui"
      }
    ],
    composition: "Chữ Hội Ý kết cấu Trên-Dưới. Dưới mái nhà che chở (宀) có bóng hình người phụ nữ (女) vun vén êm ấm thì mọi sự trong ngoài đều được định tâm, bình an vô sự.",
    examples: [
      { word: "安全", pinyin: "ānquán", meaning: "An toàn" },
      { word: "安静", pinyin: "ānjìng", meaning: "Yên tĩnh, thanh tịnh" },
      { word: "安心", pinyin: "ānxīn", meaning: "Yên tâm" }
    ]
  },
  "爱": {
    character: "爱",
    pinyin: "ài",
    sinoVietnamese: "Ái",
    vietnameseMeaning: "Yêu thương, tình yêu, yêu mến",
    totalStrokes: 10,
    strokeSequenceInstructions: [
      "Nét 1: Phẩy đỉnh",
      "Nét 2: Chấm trái",
      "Nét 3: Chấm phải",
      "Nét 4: Phẩy",
      "Nét 5: Chấm",
      "Nét 6: Ngang móc",
      "Nét 7: Phẩy",
      "Nét 8: Ngang phẩy",
      "Nét 9: Mác kéo dài"
    ],
    radicals: [
      {
        radical: "爫",
        pinyin: "zhǎo",
        sinoVietnamese: "Trảo",
        meaning: "Bàn tay nắm lấy",
        description: "Hành động chở che, âu yếm vỗ về"
      },
      {
        radical: "友",
        pinyin: "yǒu",
        sinoVietnamese: "Hữu",
        meaning: "Bạn hữu, tình thân",
        description: "Tình bạn, tình thương mến chân thành gắn kết"
      }
    ],
    composition: "Chữ Hội Ý biểu đạt tấm lòng thương yêu, ôm ấp che chở và sẻ chia tình thân ái bền chặt giữa con người với nhau.",
    examples: [
      { word: "爱情", pinyin: "àiqíng", meaning: "Tình yêu đôi lứa" },
      { word: "可爱", pinyin: "kě'ài", meaning: "Đáng yêu, dễ thương" },
      { word: "爱好", pinyin: "àihào", meaning: "Sở thích, đam mê" }
    ]
  },
  "德": {
    character: "德",
    pinyin: "dé",
    sinoVietnamese: "Đức",
    vietnameseMeaning: "Đạo đức, ân đức, phẩm hạnh",
    totalStrokes: 15,
    strokeSequenceInstructions: [
      "Nét 1: Phẩy (bộ Xích)",
      "Nét 2: Phẩy",
      "Nét 3: Sổ",
      "Nét 4: Ngang (chữ Thập)",
      "Nét 5: Sổ",
      "Nét 6: Ngang (chữ Mục)",
      "Nét 7: Sổ",
      "Nét 8: Ngang gập",
      "Nét 9: Ngang",
      "Nét 10: Ngang",
      "Nét 11: Ngang đáy",
      "Nét 12: Chấm trái (bộ Tâm)",
      "Nét 13: Nằm móc",
      "Nét 14: Chấm giữa",
      "Nét 15: Chấm phải"
    ],
    radicals: [
      {
        radical: "彳",
        pinyin: "chì",
        sinoVietnamese: "Xích",
        meaning: "Bước chân, hành động",
        description: "Nằm bên trái, thể hiện việc thực hành hành đạo ngay thẳng trên đường đời"
      },
      {
        radical: "心",
        pinyin: "xīn",
        sinoVietnamese: "Tâm",
        meaning: "Trái tim, đáy lòng",
        description: "Nằm dưới cùng, cội nguồn của mọi phẩm hạnh và lòng trắc ẩn"
      }
    ],
    composition: "Chữ Hội Ý kết cấu Trái-Phải. Gồm bộ Xích (bước chân ngay ngắn), chữ Thập (mười phương), Mục (mắt nhìn phân định rõ trắng đen), Nhất (trước sau kiên định) và Tâm (lòng son). Người có đức là người mắt nhìn sáng suốt, tâm niệm hướng thiện và hành động trước sau kiên định.",
    examples: [
      { word: "道德", pinyin: "dàodé", meaning: "Đạo đức" },
      { word: "德语", pinyin: "déyǔ", meaning: "Tiếng Đức" },
      { word: "美德", pinyin: "měidé", meaning: "Mỹ đức, phẩm chất tốt đẹp" }
    ]
  },
  "你": {
    character: "你",
    pinyin: "nǐ",
    sinoVietnamese: "Nhĩ",
    vietnameseMeaning: "Bạn, anh, chị (ngôi thứ hai)",
    totalStrokes: 7,
    strokeSequenceInstructions: [
      "Nét 1: Phẩy (bộ Nhân đứng)",
      "Nét 2: Sổ",
      "Nét 3: Phẩy (chữ Nhĩ)",
      "Nét 4: Ngang móc",
      "Nét 5: Sổ giữa",
      "Nét 6: Phẩy trái",
      "Nét 7: Chấm phải"
    ],
    radicals: [
      {
        radical: "亻",
        pinyin: "rén",
        sinoVietnamese: "Nhân đứng",
        meaning: "Con người",
        description: "Chỉ đối tượng giao tiếp bình đẳng là con người"
      },
      {
        radical: "尔",
        pinyin: "ěr",
        sinoVietnamese: "Nhĩ",
        meaning: "Ngươi, mày",
        description: "Đại từ cổ và đóng vai trò biểu âm cho chữ"
      }
    ],
    composition: "Chữ Hình Thanh kết cấu Trái-Phải. Bộ Nhân đứng (亻) biểu thị ý nghĩa con người đối thoại, chữ Nhĩ (尔) vừa biểu âm vừa là đại từ nhân xưng chỉ đối phương.",
    examples: [
      { word: "你好", pinyin: "nǐ hǎo", meaning: "Chào bạn" },
      { word: "你们", pinyin: "nǐmen", meaning: "Các bạn" },
      { word: "你的", pinyin: "nǐ de", meaning: "Của bạn" }
    ]
  },
  "我": {
    character: "我",
    pinyin: "wǒ",
    sinoVietnamese: "Ngã",
    vietnameseMeaning: "Tôi, bản thân tôi (ngôi thứ nhất)",
    totalStrokes: 7,
    strokeSequenceInstructions: [
      "Nét 1: Phẩy nằm trên đầu",
      "Nét 2: Ngang",
      "Nét 3: Sổ móc",
      "Nét 4: Hất từ trái lên",
      "Nét 5: Cong mác",
      "Nét 6: Phẩy",
      "Nét 7: Chấm góc phải"
    ],
    radicals: [
      {
        radical: "戈",
        pinyin: "gē",
        sinoVietnamese: "Qua",
        meaning: "Cây giáo, vũ khí",
        description: "Tượng trưng cho sự tự vệ, bảo vệ phẩm giá và chủ quyền bản thân"
      }
    ],
    composition: "Chữ Tượng Hình & Hội Ý. Giáp cốt văn khắc hình bàn tay cầm chắc ngọn giáo (bộ Qua - 戈) để tự vệ và xác lập chủ quyền cái Tôi, cái Ngã tự chủ độc lập của mỗi con người.",
    examples: [
      { word: "我们", pinyin: "wǒmen", meaning: "Chúng tôi, chúng ta" },
      { word: "我的", pinyin: "wǒ de", meaning: "Của tôi" },
      { word: "自我", pinyin: "zìwǒ", meaning: "Bản thân, tự thân" }
    ]
  }
};
