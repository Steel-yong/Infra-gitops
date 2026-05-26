// 게임종료 분류기 임계(치킨 노랑6%/죽음 어두움72%) 대비 실제 화면 비율 측정 — 일회성 진단
import sharp from 'sharp';
const IMG='/mnt/d/infra project/Infra-gitops/.claude/images/';
async function m(name:string, file:string){
  const {data}=await sharp(IMG+file).resize(160,90,{fit:'fill'}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  let y=0,dk=0,n=0;
  for(let i=0;i+2<data.length;i+=3){const r=data[i],g=data[i+1],b=data[i+2];n++;
    if(r>=180&&g>=140&&b<=110&&r-b>80)y++; if((r+g+b)/3<40)dk++;}
  const yr=y/n,dr=dk/n;
  console.log(`[${name}] 노랑=${(yr*100).toFixed(1)}% 어두움=${(dr*100).toFixed(1)}% → ${yr>=0.06?'chicken(초기화O)':dr>=0.72?'death(초기화O)':'null(초기화X)'}`);
}
(async()=>{await m('다음(사망 결과)','다음.png');await m('치킨','치킨.png');await m('데스','데스.png');})();
