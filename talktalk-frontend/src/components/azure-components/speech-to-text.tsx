// app/components/SpeechToText.tsx
import React, { useRef, useState } from 'react';


const SpeechToText = () => {
    const [transcript, setTranscript] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const audioRef = useRef(null);
    const [audioUrl, setAudioURL] = useState<string>();
    const startRecording = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      setIsRecording(true);
      let audioChunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        console.log("pushing event", event)
        audioChunks.push(event.data);
      };
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob)
        
        const formData = new FormData();
        formData.append("content", audioBlob);

        console.log(url)
        setAudioURL(url);
        const audioData = await audioBlob.arrayBuffer();
        console.log("TRYING TO SEND", audioData)
        const stringifiedAudioData = JSON.stringify({ audioData: Array.from(new Uint8Array(audioData))})
        // const stringifiedAudioData = JSON.stringify({ audioData });
        console.log("ACTUALLY SENDING", stringifiedAudioData)
        const response = await fetch('/api/speech-to-text', {
          method: 'POST',
          body: JSON.stringify({ url }),
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json();
        console.log("RETURNED", data)
        setTranscript(data.transcript);
        setIsRecording(false);
      };
      recorder.start();
    };
    const stopRecording = () => {
      if (mediaRecorder) {
        mediaRecorder.stop();
      }
    };
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <h2 className="text-2xl font-bold mb-4">Speech to Text</h2>
        <button
          className={`px-4 py-2 rounded-md ${isRecording ? 'bg-red-500' : 'bg-blue-500'} text-white`}
          onClick={isRecording ? stopRecording : startRecording}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        <div>
            {audioUrl && (
                <audio ref={audioRef} src={audioUrl} controls />
            )}
            </div>
        {transcript && (
          <div className="mt-6 p-4 border border-gray-300 rounded-md">
            <p className="font-mono text-lg">{transcript}</p>
          </div>
        )}
      </div>
    );
  };
  export default SpeechToText;