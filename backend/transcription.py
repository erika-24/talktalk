from google import genai
from google.genai import types
from dotenv import load_dotenv
import os

dotenv_path = os.path.join(os.path.dirname(__file__), '..', 'local.env')
load_dotenv(dotenv_path)


def transcribe(path_to_vid):
  print("test")
  client = genai.Client(api_key='AIzaSyAHDVcQLerSyEnCv8Dv3iCa6eKnXbo5gSA')

  myfile = client.files.upload(file=path_to_vid)
  prompt = 'Generate a transcript of the speech.'

  response = client.models.generate_content(
    model='gemini-2.0-flash',
    contents=[
      prompt,
      myfile
    ]
  )

  print(response.text)

# """Sample way of calling the function"""
transcribe("test.mp3")