// Import required libraries
// const fetch = require('node-fetch');
import fetch from 'node-fetch'
// const fs = require('fs');
import fs from 'fs';
// const path = require('path');
import path from 'path';
// const dotenv = require('dotenv');
import dotenv from 'dotenv'
const { SpeechConfig, AudioConfig, SpeechRecognizer, PronunciationAssessmentConfig, PropertyId, ResultReason } = require('microsoft-cognitiveservices-speech-sdk');

// Load environment variables
// dotenv.config({ path: path.join(__dirname, '../.', 'local.env') });

const speechKey = process.env.SPEECH_KEY;
const serviceRegion = "eastus";
console.log("KEY", speechKey)

// File paths for audio
const welcomeFileName = "../sample_audio/sample_welcome.wav";
const seasonsFileName = "../talktalk-frontend/public/sample_audio/vocab_fall_sample.wav";

// Pronunciation Assessment Functions
async function getPronunciationQuestion(transcript, skillLevel) {
    const questionRequest = `
    I have a video transcript. Can you give me a sentence for a ${skillLevel} language learner to say based on the transcript?
    Always return a single attribute named "sentence". Transcript: ${transcript}
    `;
  
    const response = await fetch('https://api.yourgenai.com', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.GEMINI_API_KEY}` },
        body: JSON.stringify({
            model: 'gemini-2.0-flash',
            contents: questionRequest,
            config: { response_mime_type: 'application/json' }
        })
    });
    const data = await response.json();
    return data[0].sentence;
}

async function assessPronunciation(refText, audioFile) {
    return await pronunciationAssessmentConfiguredWithJson(refText, audioFile);
}

async function pronunciationAssessmentConfiguredWithJson(refText, audioFile) {
    const speechConfig = SpeechConfig.fromSubscription(speechKey, serviceRegion);
    const audioConfig = AudioConfig.fromWavFileInput(audioFile);
  
    const configJson = {
        GradingSystem: "HundredMark",
        Granularity: "Phoneme",
        Dimension: "Comprehensive",
        EnableMiscue: true,
        EnableProsodyAssessment: true,
        NBestPhonemeCount: 0
    };

    const pronunciationConfig = new PronunciationAssessmentConfig(configJson);
    pronunciationConfig.referenceText = refText;

    const recognizer = new SpeechRecognizer(speechConfig, audioConfig);
    pronunciationConfig.applyTo(recognizer);

    return new Promise((resolve, reject) => {
        recognizer.recognizeOnceAsync(result => {
            if (result.reason === ResultReason.RecognizedSpeech) {
                const pronunciationResult = JSON.parse(result.properties.get(PropertyId.SpeechServiceResponse_JsonResult));
                const nbest = pronunciationResult.NBest[0];
                const raw = nbest.PronunciationAssessment;
                const accuracy = raw.AccuracyScore;
                const fluency = raw.FluencyScore;
                let feedback = parseResultsForFeedback(nbest);
                resolve(`Accuracy was ${(accuracy * 100).toFixed(2)}%. ${feedback}`);
            } else {
                reject("No speech could be recognized or cancellation occurred.");
            }
        });
    });
}

function parseResultsForFeedback(nbest) {
    let feedback = '';
    nbest.Words.forEach(wordInfo => {
        const wordText = wordInfo.Word;
        const err = wordInfo.PronunciationAssessment.ErrorType;
        if (err === "Omission") feedback += `You did not say the word ${wordText}. \n`;
        if (err === "Insertion") feedback += `You added the word ${wordText}. \n`;
        if (err === "Mispronunciation") feedback += `You mispronounced the word ${wordText}. \n`;
    });
    return feedback;
}

// Content and Pronunciation Assessment
export async function contentAndPronunciationAssessment(audioFile, transcript, question) {
    const speechConfig = SpeechConfig.fromSubscription(speechKey, serviceRegion);
    const audioConfig = AudioConfig.fromWavFileInput(fs.readFileSync(audioFile));
  
    const configJson = {
        GradingSystem: "HundredMark",
        Granularity: "Phoneme",
        Dimension: "Comprehensive",
        EnableMiscue: true,
        EnableProsodyAssessment: true,
        NBestPhonemeCount: 0
    };

    const pronunciationConfig = new PronunciationAssessmentConfig(configJson);

    const recognizer = new SpeechRecognizer(speechConfig, audioConfig);
    pronunciationConfig.applyTo(recognizer);

    return new Promise((resolve, reject) => {
        recognizer.recognizeOnceAsync(result => {
            if (result.reason === ResultReason.RecognizedSpeech) {
                const pronunciationResult = JSON.parse(result.properties.get(PropertyId.SpeechServiceResponse_JsonResult));
                const nbest = pronunciationResult.NBest[0];
                const raw = nbest.PronunciationAssessment;
                const acc = (raw.AccuracyScore + raw.FluencyScore) / 2;
                const accuracy = rescaleAccuracy(acc);
                assessOnTopicness(transcript, question, result.text).then(feedback => {
                    feedback.pronunciation_score = accuracy;
                    resolve(feedback);
                }).catch((err) => {
                    reject(`Error in topic assessment: ${err}`);
                });

                // return feedback;
            } else {
                const cancellation_details = fromResult(result)
                reject(`No speech could be recognized or cancellation occurred, reason ${result.reason}, details ${cancellation_details}`);
            }
        });
    });
}

function rescaleAccuracy(accuracy) {
    const cutoff = 20;
    if (accuracy <= cutoff) return 0;
    accuracy -= cutoff;
    return accuracy / (100 - cutoff);
}

// Assess the response to a question on topicness
async function assessOnTopicness(transcript, question, answer) {
    const questionRequest = `
    I have a video transcript, a question based on the transcript, and an answer to the question. Please give me a numerical score from 1 to 10 on how well the response answers the question, one sentence of feedback, and one example sentence I could have said instead. Act like a high school teacher. Always return the same three attributes: topic_score, feedback, example_sentence.

    Transcript: ${transcript}
    Question: ${question}
    Response: ${answer}
    `;
  
    const response = await fetch('https://api.yourgenai.com', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.GEMINI_API_KEY}` },
        body: JSON.stringify({
            model: 'gemini-2.0-flash',
            contents: questionRequest,
            config: { response_mime_type: 'application/json' }
        })
    });
  
    const data = await response.json();
    return data[0];
}

// Example usage
// res = contentAndPronunciationAssessment(seasonsFileName, `
// Fall is a special and unique season. It marks the beginning of shortened
// days and sunshiney but chilly weather.
// It comes in a burst of color but ushers in the dark, coldness of winter.`, "Describe what fall means to you.");

// res.then(x => {
//     console.log("Resolved!");
//     console.log(x)
// }).catch((err) => {
//     console.log(err);
// })
