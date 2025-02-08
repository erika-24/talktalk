from google import genai
from dotenv import load_dotenv
import os
import json

dotenv_path = os.path.join(os.path.dirname(__file__), '..', 'local.env')
load_dotenv(dotenv_path)

multiple_choice = """, four possible answer choices with the attribute name
                  'options', and which answer is correct with the attribute name
                  'correct' .\n"""
open_ended = "and 2 <10 word sample answers with the attribute name 'sample answers'.\n"

""" Generates 3 questions, either multiple choice or open ended, based on the mode
    @param mode: the type of questions to generate (multiple choice or open ended)
                 if multiple choice, will generate 4 answer options and the correct answer
                 if open ended, will generate 2 sample answers
    @param transcript: the transcript of the video
    @param skill_level: the skill level of the user (beginner, intermediate, advanced)
    @return: a json object with the questions, options, and answer
"""
def makeComprehension(mode, transcript, skill_level, output_path):
  question_request = """Please on one line generate json with 3
                     total items in the array, each consisting of a <15 word
                     question based on what occurred in the video with the
                     attribute name 'question' """
  mode_input = multiple_choice if mode == "multiple_choice" else open_ended
  difficulty_request = getDifficulty(skill_level)
  transcript_request = """Generate this content based on the following
                          transcript: \n """

  client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
  response = client.models.generate_content(
      model='gemini-2.0-flash',
      contents=f"""{question_request} {mode_input} {difficulty_request}
  #                  {transcript_request} {transcript}""",
      config={
          'response_mime_type': 'application/json',
      },
  )
  print(response.text)
  return response.text
  # kevin lmk if this doesn't work

""" Tailor the questions based on skill level """
def getDifficulty(skill_level):
  if skill_level == "beginner":
    return """Make the questions primarily focused around things facts based on
              transcript and any easily observable main ideas \n"""
  elif skill_level == "intermediate":
    return """Make the questions primarily focused around smaller details of the
              video and explanations of what occured in the video \n"""
  else:
    return """Make the questions primarily focused around motivations for the
              video and what smaller details occured in the video\n"""

# """Sample way of calling the function"""
test_transcript = """hi everyone today here's a what's in my bag video. some top
                     essentials i have with myself at all times include my
                     phone, laptop, and ipad. see you all next time!"""
makeComprehension("multiple_choice", test_transcript, "advanced", "output.json")