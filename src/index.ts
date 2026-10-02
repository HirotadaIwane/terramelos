export type ActivityData={date:string;quakes:{time:number;mag:number;depth:number;lon:number;lat:number;place:string}[]};
const FIFTHS=['C','G','D','A','E','B','F#','Db','Ab','Eb','Bb','F'] as const;
const ROOTS=[0,7,2,9,4,11,6,1,8,3,10,5];
const MODES={dorian:[0,2,3,5,7,9,10],aeolian:[0,2,3,5,7,8,10],phrygian:[0,1,3,5,7,8,10]};
export function dayKey(quakes:ActivityData['quakes']){
 if(!quakes.length)return {root:'D' as const,mode:'aeolian' as const,rootMidi:50};
 const peak=quakes.reduce((a,b)=>b.mag>a.mag?b:a);
 const idx=Math.floor((((peak.lon+180)%360)+360)%360/30);
 const depth=quakes.reduce((sum,q)=>sum+q.depth,0)/quakes.length;
 const mode:keyof typeof MODES=depth<35?'dorian':depth<70?'aeolian':'phrygian';
 return {root:FIFTHS[idx],mode,rootMidi:48+ROOTS[idx]};
}
// Latitude selects scale degrees I–VII in the day's key and mode.
export function coordinateChord(lat:number,lon:number,key:ReturnType<typeof dayKey>){
 const scale=MODES[key.mode];
 const degree=Math.min(6,Math.max(0,Math.floor((lat+90)/180*7)));
 const note=(step:number)=>key.rootMidi+scale[step%7]+12*Math.floor(step/7);
 return {notes:[note(degree)-12,note(degree+2),note(degree+4),note(degree+6)],bright:Math.max(0,Math.min(1,(lon+180)/360)),pan:Math.max(-.65,Math.min(.65,lon/180*.65))};
}
export function playbackEvents(d:ActivityData){
 const start=Date.parse(d.date+'T00:00:00Z');
 return d.quakes.map((q,index)=>({...q,index,t:(q.time-start)/86400000*60})).filter(q=>q.t>=0&&q.t<60).sort((a,b)=>a.t-b.t||a.index-b.index);
}
export function compose(d:ActivityData){
 const rate=24000,len=rate*60,L=new Float32Array(len),R=new Float32Array(len);
 const quakes=playbackEvents(d),key=dayKey(d.quakes);
 // One sustained chord per four-second window, chosen by its strongest event.
 // Quiet intervals stay quiet: every sound is grounded in an earthquake.
 for(let window=0;window<60;window+=4){
  const group=quakes.filter(q=>q.t>=window&&q.t<window+4);
  if(!group.length)continue;
  const q=group.reduce((a,b)=>a.mag>=b.mag?a:b),chord=coordinateChord(q.lat,q.lon,key);
  const at=Math.floor(group[0].t*rate),dur=10,n=Math.min(dur*rate,len-at);
  for(let voice=0;voice<chord.notes.length;voice++){
   const f=440*2**((chord.notes[voice]-69)/12),pan=Math.max(-.85,Math.min(.85,chord.pan+(voice-1.5)*.12));
   for(let i=0;i<n;i++){
    const x=i/rate,en=(1-Math.exp(-x/1.1))*Math.exp(-x/3.8)*Math.min(1,(n-i)/(rate*1.5));
    const drift=.003*Math.sin(2*Math.PI*.09*x+voice),phase=2*Math.PI*f*x;
    const wave=(Math.sin(phase*(1+drift)) + .55*Math.sin(phase*.998)+.18*chord.bright*Math.sin(phase*2)) / 1.73;
    const shimmer=.88+.12*Math.sin(2*Math.PI*.13*x+voice);
    const v=wave*en*.038*shimmer;
    L[at+i]+=v*Math.sqrt((1-pan)/2);R[at+i]+=v*Math.sqrt((1+pan)/2);
   }
  }
 }
 // Dark stereo echoes: pad tails overlap gently without becoming an arpeggio.
 const echoL=Math.floor(rate*.375),echoR=Math.floor(rate*.5);
 for(let i=0;i<len;i++){if(i>=echoL)L[i]+=L[i-echoL]*.24;if(i>=echoR)R[i]+=R[i-echoR]*.24;}
 // Earthquake kicks preserve the magnitude and depth mapping.
 const kickScale=[0,1,2,4,6].map(degree=>MODES[key.mode][degree]);
 const kickRoot=key.rootMidi;
 for(const q of quakes){
  const at=Math.floor(q.t*rate),dur=.4+Math.max(0,Math.min(q.depth,600))/300;
  const count=Math.min(Math.floor(dur*rate),len-at);
  const index=Math.abs(Math.round(q.lon/20))%5;
  const f=440*2**((kickRoot-24+kickScale[index]-69)/12);
  const amp=Math.max(0,Math.min(.2,.04+(q.mag-2.5)*.035));
  const pan=Math.max(-.85,Math.min(.85,q.lon/180));
  for(let i=0;i<count;i++){
   const x=i/rate,en=Math.min(1,x/.012)*Math.exp(-x/(dur/4))*Math.min(1,(count-i)/500);
   const v=Math.sin(2*Math.PI*(f*x+22*(1-Math.exp(-x*12))))*en*amp;
   L[at+i]+=v*Math.sqrt((1-pan)/2);R[at+i]+=v*Math.sqrt((1+pan)/2);
  }
 }
 let peak=0;for(let i=0;i<len;i++)peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]));const gain=.82/Math.max(.3,peak);
 for(let i=0;i<len;i++){const fade=Math.min(1,i/(rate*.4),(len-i)/(rate*2));L[i]*=gain*fade;R[i]*=gain*fade;}
 return {L,R,rate,events:quakes.map(q=>({...q,t:Math.floor(q.t*rate)/rate}))};
}

/** Render a UTC day as 60 seconds of stereo PCM. Does not fetch data or play audio. */
export function renderDay(data: ActivityData) {
 const {L,R,rate}=compose(data);
 return {left:L,right:R,sampleRate:rate,duration:60 as const};
}
