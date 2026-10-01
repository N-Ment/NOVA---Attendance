/** Face recognition descriptor is held in memory only until the API request. */
const NovaFace=(()=>{
  const MODEL_URL='https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
  let stream=null,active=false,modelsReady=false;
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function loadModels(){
    if(!window.faceapi)throw new Error('โหลด face-api.js ไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่');
    if(!modelsReady){
      await Promise.all([
        window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      modelsReady=true;
    }
  }
  async function start(video,onStatus){
    if(active)throw new Error('กล้องกำลังทำงาน');
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('ต้องเปิดเว็บผ่าน HTTPS และอนุญาตกล้อง');
    active=true;
    try{
      onStatus('กำลังเปิดกล้อง…');
      stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480}}});
      if(!active){stream.getTracks().forEach(track=>track.stop());stream=null;throw new Error('ยกเลิกการสแกน');}
      video.srcObject=stream;await video.play();
      onStatus('กำลังโหลดโมเดลใบหน้า…');
      await loadModels();if(!active)throw new Error('ยกเลิกการสแกน');
      const samples=[],deadline=Date.now()+60000;
      while(active&&Date.now()<deadline){
        if(video.readyState>=2){
          const faces=await window.faceapi.detectAllFaces(video,new window.faceapi.TinyFaceDetectorOptions({inputSize:320,scoreThreshold:0.5})).withFaceLandmarks().withFaceDescriptors();
          if(!active)break;
          if(faces.length===1&&faces[0].descriptor?.length===128){
            samples.push(Array.from(faces[0].descriptor));
            onStatus(`พบใบหน้า 1 คน (${samples.length}/2)`);
            if(samples.length>=2)return samples[0].map((value,i)=>(value+samples[1][i])/2);
          }else{samples.length=0;onStatus(faces.length>1?'พบหลายใบหน้า กรุณาอยู่ในกรอบเพียงคนเดียว':'จัดใบหน้าให้อยู่กลางกรอบ');}
        }
        await pause(700);
      }
      if(!active)throw new Error('ยกเลิกการสแกน');
      throw new Error('ครบเวลาสแกน 1 นาที กรุณาลองใหม่');
    }finally{stop();}
  }
  function stop(){active=false;if(stream){stream.getTracks().forEach(track=>track.stop());stream=null;}}
  return {start,stop};
})();
