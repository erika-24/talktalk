#############################
# Speech Assessment Interface

# 4 Client Functions
    # Create pronunciation question
    # Assess pronunciation answer
    # Create Content-Recall question
    # Assess content-recall answer
#############################
import json
import io
import sys
import os
from google import genai
from os.path import join, dirname
from dotenv import load_dotenv

# load_dotenv()  # Load variables from .env file
dotenv_path = join(dirname(__file__), '..', 'local.env')
load_dotenv(dotenv_path)

try:
    import azure.cognitiveservices.speech as speechsdk
except ImportError:
    print("""
    Importing the Speech SDK for Python failed.
    Refer to
    https://docs.microsoft.com/azure/cognitive-services/speech-service/quickstart-python for
    installation instructions.
    """)
    sys.exit(1)

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Set up the subscription info for the Speech Service:
# Replace with your own subscription key and service region (e.g., "westus").
speech_key, service_region = os.environ.get("SPEECH_KEY"), "eastus"
print(speech_key, service_region)

# Specify the path to an audio file containing speech (mono WAV / PCM with a sampling rate of 16
# kHz).
welcomefilename = "../sample_audio/sample_welcome.wav"
seasonsfilename = "../sample_audio/vocab_fall_sample.wav"


# Pronunciation

# Part 1: Question generation
# @input: transcript, skill
# @output: Sentence to say
def get_pronunciation_question(transcript, skill_level):
    question_request = f"""
I have a video transcript. Can you give me a sentence for a {skill_level} language learner to say based on the transcript?
Always return a single attribute named "sentence". Transcript: {transcript}
    """ 

    client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
    response = client.models.generate_content(
        model='gemini-2.0-flash',
        contents=question_request,
        config={
            'response_mime_type': 'application/json',
        },
    )
    return json.loads(response.text)[0]["sentence"]

# Part 2: Assessment
# @input: reference text, audio file path
# @output: qualitative feedback string, try again t/f?
def assess_pronunciation(ref_text, audio_file):
     pronunciation_assessment_configured_with_json(ref_text, audio_file)

def pronunciation_assessment_configured_with_json(ref_text, audio_file):
    """Performs pronunciation assessment asynchronously with input from an audio file.
        See more information at https://aka.ms/csspeech/pa"""

    # Creates an instance of a speech config with specified subscription key and service region.
    # Replace with your own subscription key and service region (e.g., "westus").
    # Note: The sample is for en-US language.
    speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=service_region)
    audio_config = speechsdk.audio.AudioConfig(filename=audio_file)

    reference_text = ref_text
    # Create pronunciation assessment config with json string (JSON format is not recommended)
    enable_miscue, enable_prosody = True, True
    config_json = {
        "GradingSystem": "HundredMark",
        "Granularity": "Phoneme",
        "Dimension": "Comprehensive",
        "ScenarioId": "",  # "" is the default scenario or ask product team for a customized one
        "EnableMiscue": enable_miscue,
        "EnableProsodyAssessment": enable_prosody,
        "NBestPhonemeCount": 0,  # > 0 to enable "spoken phoneme" mode, 0 to disable
    }
    pronunciation_config = speechsdk.PronunciationAssessmentConfig(json_string=json.dumps(config_json))
    pronunciation_config.reference_text = reference_text

    # Create a speech recognizer using a file as audio input.
    language = 'es-MX'
    speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, language=language, audio_config=audio_config)
    # (Optional) get the session ID
    speech_recognizer.session_started.connect(lambda evt: print(f"SESSION ID: {evt.session_id}"))
    # Apply pronunciation assessment config to speech recognizer
    pronunciation_config.apply_to(speech_recognizer)

    result = speech_recognizer.recognize_once_async().get()

    # Check the result
    if result.reason == speechsdk.ResultReason.RecognizedSpeech:
        print('pronunciation assessment for: {}'.format(result.text))
        pronunciation_result = json.loads(result.properties.get(speechsdk.PropertyId.SpeechServiceResponse_JsonResult))
        # print('assessment results:\n{}'.format(json.dumps(pronunciation_result, indent=4)))
        nbest = pronunciation_result["NBest"][0]
        raw = nbest["PronunciationAssessment"]
        print(f"Raw accuracy was {raw}")
        acc, feedback = parse_results_for_feedback(nbest)
        formatted_acc = "{0:.2f}".format(acc*100)
        return f"Accuracy was {formatted_acc}%.{' '+feedback if feedback != '' else ''}"
    elif result.reason == speechsdk.ResultReason.NoMatch:
        print("No speech could be recognized")
        return None
    elif result.reason == speechsdk.ResultReason.Canceled:
        cancellation_details = result.cancellation_details
        print("Speech Recognition canceled: {}".format(cancellation_details.reason))
        if cancellation_details.reason == speechsdk.CancellationReason.Error:
            print("Error details: {}".format(cancellation_details.error_details))
        return None

def rescale_accuracy(accuracy):
    cutoff = 20
    if accuracy <= cutoff: return 0
    accuracy -= cutoff
    return (accuracy / (100 - cutoff))

def parse_results_for_feedback(nbest):
    accuracy = nbest["PronunciationAssessment"]["AccuracyScore"]
    fluency = nbest["PronunciationAssessment"]["FluencyScore"]
    if fluency != 100: accuracy = (accuracy + fluency)/2
    accuracy = rescale_accuracy(accuracy)
    feedback = ''
    for word_info in nbest["Words"]:
        word_text = word_info["Word"]
        err = word_info["PronunciationAssessment"]["ErrorType"]
        if err == "Omission":
            feedback += f"You did not say the word {word_text}. \n"
        elif err == "Insertion":
            feedback += f"You added the word {word_text}. \n"
        elif err == "Mispronunciation":
            feedback += f"You mispronounced the word {word_text}. \n"

        # Omission, Insertion, Mispronunciation, UnexpectedBreak, MissingBreak, and Monotone.
    return accuracy, feedback

# Part 3: Open-Ended Question assessment
# @input: audio file path, video transcript, open ended question
# @output: JSON object of type {'topic_score': number out of 10, 'feedback': string, 'example_sentence': string, 'pronunciation_score': number 0 to 1}
'''example output:
{   
    'topic_score': 7, 
    'feedback': 'This response is descriptive and paints a beautiful picture of fall, but it could be more direct in answering what fall means to *you* personally.', 
    'example_sentence': 'Fall, to me, is a time of reflection and appreciation for the beauty of nature before the dormancy of winter sets in.', 
    'pronunciation_score': 0.9625
}
'''
def content_and_pronunciation_assessment(audio_file, transcript, question):
    """Performs pronunciation assessment asynchronously with input from an audio file.
        See more information at https://aka.ms/csspeech/pa"""

    # Creates an instance of a speech config with specified subscription key and service region.
    # Replace with your own subscription key and service region (e.g., "westus").
    # Note: The sample is for en-US language.
    speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=service_region)
    audio_config = speechsdk.audio.AudioConfig(filename=audio_file)

    # Create pronunciation assessment config with json string (JSON format is not recommended)
    enable_miscue, enable_prosody = True, True
    config_json = {
        "GradingSystem": "HundredMark",
        "Granularity": "Phoneme",
        "Dimension": "Comprehensive",
        "ScenarioId": "",  # "" is the default scenario or ask product team for a customized one
        "EnableMiscue": enable_miscue,
        "EnableProsodyAssessment": enable_prosody,
        "NBestPhonemeCount": 0,  # > 0 to enable "spoken phoneme" mode, 0 to disable
    }
    pronunciation_config = speechsdk.PronunciationAssessmentConfig(json_string=json.dumps(config_json))

    # Create a speech recognizer using a file as audio input.
    language = 'en-US'
    speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, language=language, audio_config=audio_config)
    # (Optional) get the session ID
    speech_recognizer.session_started.connect(lambda evt: print(f"SESSION ID: {evt.session_id}"))
    # Apply pronunciation assessment config to speech recognizer
    pronunciation_config.apply_to(speech_recognizer)

    result = speech_recognizer.recognize_once_async().get()
    response = result.text

    feedback_on_topicality = assess_on_topicness(transcript, question, response)

    # Check the result
    if result.reason == speechsdk.ResultReason.RecognizedSpeech:
        pronunciation_result = json.loads(result.properties.get(speechsdk.PropertyId.SpeechServiceResponse_JsonResult))
        # print('assessment results:\n{}'.format(json.dumps(pronunciation_result, indent=4)))
        nbest = pronunciation_result["NBest"][0]
        raw = nbest["PronunciationAssessment"]
        acc = (raw["AccuracyScore"] +  raw["FluencyScore"])/2
        accuracy = rescale_accuracy(acc)
        feedback_on_topicality["pronunciation_score"] = accuracy
        print(feedback_on_topicality)
        return feedback_on_topicality
    elif result.reason == speechsdk.ResultReason.NoMatch:
        print("No speech could be recognized")
        return None
    elif result.reason == speechsdk.ResultReason.Canceled:
        cancellation_details = result.cancellation_details
        print("Speech Recognition canceled: {}".format(cancellation_details.reason))
        if cancellation_details.reason == speechsdk.CancellationReason.Error:
            print("Error details: {}".format(cancellation_details.error_details))
        return None
    
def assess_on_topicness(transcript, question, response):
    question_request = f"""
I have a video transcript, a question based on the transcript, and a response to the question. Please give me a numerical score from 1 to 10 on how sentences on how well the response answers the question, one sentence of feedback, and one example sentence I could have said instead. Act like a high school teacher. Always return the same three attributes: topic_score, feedback, example_sentence.

Transcript: {transcript}
Question: {question}
Response: {response}
    """

    client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
    response = client.models.generate_content(
        model='gemini-2.0-flash',
        contents=question_request,
        config={
            'response_mime_type': 'application/json',
        },
    )
    return json.loads(response.text)[0]
    

content_and_pronunciation_assessment(seasonsfilename, '''
Fall is a special and unique season. It marks the beginning of shortened
                                     days and sunshiney but chilly weather.
                                     It comes in a burst of color but 
                                     ushers in the dark, coldness of winter.''', "Describe what fall means to you.")

# get_pronunciation_question('''
# Fall is a special and unique season. It marks the beginning of shortened
#                                      days and sunshiney but chilly weather.
#                                      It comes in a burst of color but 
#                                      ushers in the dark, coldness of winter.''', "beginner")