const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('public/js/face.js','utf8');
let stops=0,calls=0,loaded=0;
const vector=Array.from({length:128},(_,i)=>i===0?0.5:0);
const faceapi={
  nets:{tinyFaceDetector:{loadFromUri:async()=>loaded++},faceLandmark68Net:{loadFromUri:async()=>loaded++},faceRecognitionNet:{loadFromUri:async()=>loaded++}},
  TinyFaceDetectorOptions:class{},
  detectAllFaces:()=>({withFaceLandmarks:()=>({withFaceDescriptors:async()=>{calls++;return [{descriptor:vector}];}})})
};
const window={isSecureContext:true,faceapi};
const video={readyState:2,srcObject:null,play:async()=>{}};
const ctx=vm.createContext({Date,Error,Promise,setTimeout:fn=>fn(),navigator:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop:()=>stops++}]})}},window});
vm.runInContext(source,ctx);
(async()=>{
  const result=await vm.runInContext('NovaFace.start',ctx)(video,()=>{});
  assert(Array.isArray(result)&&result.length===128);
  assert(Math.abs(result[0]-0.5)<1e-9);
  assert.strictEqual(calls,1);assert.strictEqual(loaded,3);assert.strictEqual(stops,1);
  console.log('PASS face descriptor capture, one attendance sample, model loading, camera cleanup');
})().catch(error=>{console.error(error);process.exit(1)});
