import React, { useState, useEffect, useRef } from 'react';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

function parseResultsForFeedback(words) {
  let feedback = '';
  words.forEach(wordInfo => {
      const wordText = wordInfo.Word;
      const err = wordInfo.PronunciationAssessment.ErrorType;
      if (err === "Omission") feedback += `You did not say the word ${wordText}. \n`;
      if (err === "Insertion") feedback += `You added the word ${wordText}. \n`;
      if (err === "Mispronunciation") feedback += `You mispronounced the word ${wordText}. \n`;
  });
  return feedback;
}

function rescaleAccuracy(accuracy) {
  // const cutoff = 20;
  // if (accuracy <= cutoff) return 0;
  // accuracy -= cutoff;
  return accuracy * 20;
}


export function SpeechToText(
  {
    referenceText
  }
) {

  const SPEECH_KEY = "75DPZx6SPx84mwP5QC2LXdQSZECnE5mJ73ZQNsylOTTY1YWZ1wrjJQQJ99BBACYeBjFXJ3w3AAAAACOGCju2";
  const SPEECH_REGION = "eastus";

  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState("");
  const speechConfig = useRef(null);
  const audioConfig = useRef(null);
  const pronunciationConfig = useRef(null);
  const recognizer = useRef(null);

  const [recognizingTranscript, setRecTranscript] = useState("");
  const configJson = {
    GradingSystem: "HundredMark",
    Granularity: "Phoneme",
    Dimension: "Comprehensive",
    EnableMiscue: true,
    EnableProsodyAssessment: true,
    NBestPhonemeCount: 0
  };

  useEffect(() => {
    speechConfig.current = sdk.SpeechConfig.fromSubscription(
      SPEECH_KEY,
      SPEECH_REGION
    );
    speechConfig.current.speechRecognitionLanguage = 'es-MX';

    audioConfig.current = sdk.AudioConfig.fromDefaultMicrophoneInput();
    pronunciationConfig.current = new sdk.PronunciationAssessmentConfig(
      {
        GradingSystem: "HundredMark",
        Granularity: "Phoneme",
        Dimension: "Comprehensive",
        EnableMiscue: true,
        EnableProsodyAssessment: true,
        NBestPhonemeCount: 0
      }
    );
    pronunciationConfig.current.referenceText = referenceText;
    
    recognizer.current = new sdk.SpeechRecognizer(
      speechConfig.current,
      audioConfig.current
    );
    pronunciationConfig.current.applyTo(recognizer.current);

    const processRecognizedTranscript = (event) => {
      const result = event.result;
      console.log('Recognition result:', result);

      if (result.reason === sdk.ResultReason.RecognizedSpeech) {
        const transcript = result.text;
        console.log('Transcript: -->', transcript);
        // Call a function to process the transcript as needed
        const pronunciationResult = sdk.PronunciationAssessmentResult.fromResult(result);
        console.log("res in this exact fn", pronunciationResult);
        const raw = pronunciationResult["privPronJson"]["PronunciationAssessment"]
        const acc = (raw.AccuracyScore + raw.FluencyScore) / 2;
        const accuracy = rescaleAccuracy(acc);
        const feed = parseResultsForFeedback( pronunciationResult["privPronJson"]["Words"]);
        console.log("setting feedback");
        setFeedback(`Score: ${accuracy}%. ${feed}`);
        console.log("feedback is now", feedback)

        setMyTranscript(transcript);
      }
    };

    const processRecognizingTranscript = (event) =>{
        const result = event.result;
        console.log('Recognition result:', result);
        if (result.reason === sdk.ResultReason.RecognizingSpeech) {
            const transcript = result.text;
            console.log('Transcript: -->', transcript);
            
            // Call a function to process the transcript as needed
    
            setRecTranscript(transcript);
        }
    }

    recognizer.current.recognized = (s, e) => processRecognizedTranscript(e);
    recognizer.current.recognizing = (s, e) => processRecognizingTranscript(e);


    recognizer.current.startContinuousRecognitionAsync(() => {
      console.log('Speech recognition started.');
      setIsListening(true);
    });

    return () => {
      recognizer.current.stopContinuousRecognitionAsync(() => {
        setIsListening(false);
      });
    };
  }, []);

  const pauseListening = () => {
    setIsListening(false);
    recognizer.current.stopContinuousRecognitionAsync();
    console.log('Paused listening.');
  };

  const resumeListening = () => {
    if (!isListening) {
      setIsListening(true);
      recognizer.current.startContinuousRecognitionAsync(() => {
        console.log('Resumed listening...');
      });
    }
  };

  const stopListening = () => {
    setIsListening(false);
    recognizer.current.stopContinuousRecognitionAsync(() => {
      console.log('Speech recognition stopped.');
    });
  };

  return (
    <div>
      {/* <button onClick={pauseListening}>Pause Listening</button> */}
      <button onClick={resumeListening}>Start Listening</button>
      <button onClick={stopListening}>Stop Listening</button>

      <div>
        <div>
            Recognizing Transcript : {recognizingTranscript}
        </div>
        {feedback != "" && <div>
          <p>Here's some feedback on what you said.</p>
          <p>{feedback}</p>
        </div>}
      </div>
    </div>
  );
};