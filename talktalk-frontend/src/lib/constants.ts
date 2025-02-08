import { QuizQuestion } from "@/types/quiz-data";

export const languagesToLearn = [
  { label: "Spanish", value: "es" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
  { label: "Italian", value: "it" },
  { label: "Japanese", value: "ja" },
  { label: "Korean", value: "ko" },
  { label: "Mandarin Chinese", value: "zh" },
] as const;

export const proficiencyLevels = [
  { label: "Beginner", value: "1" },
  { label: "Intermediate", value: "2" },
  { label: "Advanced", value: "3" },
] as const;

export const contentCategories = [
  { label: "Travel & Culture", value: "travel" },
  { label: "Food & Cooking", value: "food" },
  { label: "Sports & Fitness", value: "sports" },
  { label: "Music & Arts", value: "arts" },
  { label: "Business & Professional", value: "business" },
  { label: "Daily Life & Conversation", value: "daily" },
  { label: "News & Current Events", value: "news" },
  { label: "Education & Classroom", value: "education" },
  { label: "Entertainment", value: "entertainment" },
  { label: "Technology", value: "tech" },
] as const;

export const MOCK_VIDEOS = [
  {
    id: "1",
    url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    caption: "Amazing views! #views",
    likes: 1234,
    username: "@viewer",
  },
  {
    id: "2",
    url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    caption: "Dance moves 🕺 #dance",
    likes: 5678,
    username: "@dancer",
  },
  {
    id: "3",
    url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    caption: "Fun times! 🎉 #fun",
    likes: 9012,
    username: "@funtime",
  },
];

export const quizData: QuizQuestion[] = [
  {
    question: "What type of video is this?",
    answers: [
      "Makeup tutorial",
      "What's in my bag",
      "Cooking show",
      "Travel vlog",
    ],
    correct_answer: "What's in my bag",
  },
  {
    question: "Which device was mentioned as a top essential?",
    answers: ["Television", "Phone", "Gaming console", "Smart watch"],
    correct_answer: "Phone",
  },
  {
    question: "Besides a phone, what other devices were mentioned?",
    answers: [
      "Tablet and E-reader",
      "Laptop and iPad",
      "Camera and microphone",
      "Headphones and speakers",
    ],
    correct_answer: "Laptop and iPad",
  },
];

export const CDNURL =
  "https://lhayczdxenefkmxgdgif.supabase.co/storage/v1/object/public/videos/";
