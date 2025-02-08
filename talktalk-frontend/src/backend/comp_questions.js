const { GoogleGenerativeAI } = require("@google/generative-ai");

const multipleChoice = `, four possible answer choices with the attribute name 'options', and which answer is correct with the attribute name 'correct'.\n`;
const openEnded = `and 2 <10 word sample answers with the attribute name 'sample answers'.\n`;

/**
 * Generates 3 questions, either multiple choice or open ended, based on the mode
 * @param {string} mode - The type of questions to generate (multiple choice or open ended)
 *                        if multiple choice, will generate 4 answer options and the correct answer
 *                        if open ended, will generate 2 sample answers
 * @param {string} transcript - The transcript of the video
 * @param {string} skillLevel - The skill level of the user (beginner, intermediate, advanced)
 * @param {string} outputPath - The path to save the output JSON file
 * @return {Promise<string>} - A JSON string with the questions, options, and answer
 */
async function makeComprehension(mode, transcript, skillLevel, outputPath) {
  const questionRequest = `Please on one line generate json with 3 total items in the array, each consisting of a <15 word question based on what occurred in the video with the attribute name 'question' `;
  const modeInput = mode === 'multiple_choice' ? multipleChoice : openEnded;
  const difficultyRequest = getDifficulty(skillLevel);
  const transcriptRequest = `Generate this content based on the following transcript: \n`;

  const client = new GoogleGenerativeAI({"AIzaSyAHDVcQLerSyEnCv8Dv3iCa6eKnXbo5gSA" });
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

  try {
    const response = await model.generateContent(`${questionRequest} ${modeInput} ${difficultyRequest} ${transcriptRequest} ${transcript}`);
    const result = await response.json();
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(result);
    return JSON.stringify(result);
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
}

/**
 * Tailor the questions based on skill level
 * @param {string} skillLevel - The skill level of the user (beginner, intermediate, advanced)
 * @return {string} - The difficulty request string
 */
function getDifficulty(skillLevel) {
  if (skillLevel === 'beginner') {
    return `Make the questions primarily focused around things facts based on transcript and any easily observable main ideas \n`;
  } else if (skillLevel === 'intermediate') {
    return `Make the questions primarily focused around smaller details of the video and explanations of what occurred in the video \n`;
  } else {
    return `Make the questions primarily focused around motivations for the video and what smaller details occurred in the video\n`;
  }
}

// Sample way of calling the function
const testTranscript = `hi everyone today here's a what's in my bag video. some top essentials i have with myself at all times include my phone, laptop, and ipad. see you all next time!`;
makeComprehension('multiple_choice', testTranscript, 'advanced', 'output.json');