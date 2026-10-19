import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// O mesmo globo passa por repouso → rachaduras → abertura → voo → página.
export class GlobeOpening {
  constructor({scene,world,pivot,glass,view,onChange,onComplete}) {
    Object.assign(this,{scene,world,pivot,glass,view,onChange,onComplete});
    this.active=false;this.playing=false;this.landing=false;this.flySound=false;this.elapsed=0;this.ended=false;this.count=0;
    this.cracks=new THREE.Group();this.cracks.visible=false;world.add(this.cracks);
    const lineMat=new THREE.LineBasicMaterial({color:0xffeed7,transparent:true,opacity:.72,depthWrite:false});
    const paths=[
      [[.26,.38],[.05,.17],[.18,-.09],[-.14,-.31],[-.2,-.64],[-.52,-.89]],
      [[.26,.38],[.63,.51],[.81,.32],[1.12,.48],[1.41,.18]],
      [[.26,.38],[.1,.69],[.29,.88],[.12,1.2],[.37,1.6]],
      [[.05,.17],[-.39,.26],[-.62,.52],[-.9,.44],[-1.37,.76]],
      [[-.14,-.31],[-.56,-.22],[-.77,-.4],[-1.21,-.47],[-1.57,-.25]],
      [[.81,.32],[.9,-.04],[.75,-.21],[.93,-.6],[.85,-.94]],
      [[.1,.69],[-.3,.85],[-.47,1.17],[-.8,1.43]],
      [[.75,-.21],[.4,-.38],[.48,-.75],[.21,-1.08]],
      [[-.62,.52],[-.82,.11],[-1.19,-.04],[-1.61,.19]],
      [[1.12,.48],[1.31,.8],[1.14,1.1]],
      [[.18,-.09],[.46,-.04],[.51,.17],[.87,.11]],
      [[-.2,-.64],[-.02,-.8],[-.12,-1.15]]
    ];
    paths.forEach((path,i)=>{
      const points=path.map(([x,y])=>new THREE.Vector3(x,1.95+y,Math.sqrt(Math.max(.05,1.955**2-x*x-y*y))));
      const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),lineMat);line.renderOrder=12;line.userData.level=Math.min(4,1+Math.floor(i/3));this.cracks.add(line);
    });
    this.shards=[];
    const cap=Math.acos((.79-1.95)/1.95),phi=Math.PI*2/8,theta=cap/4;
    for(let row=0;row<4;row++)for(let col=0;col<8;col++) {
      const geom=new THREE.SphereGeometry(1.95,10,8,col*phi,phi,row*theta,theta);
      geom.computeBoundingBox();const center=geom.boundingBox.getCenter(new THREE.Vector3());geom.translate(-center.x,-center.y,-center.z);
      const mat=glass.material.clone();const mesh=new THREE.Mesh(geom,mat);
      mesh.position.copy(center);mesh.position.y+=1.95;mesh.visible=false;mesh.renderOrder=9;
      mesh.userData.origin=mesh.position.clone();
      mesh.userData.velocity=center.clone().normalize().multiplyScalar(1.1+(col%3)*.3);mesh.userData.velocity.y+=.45;
      mesh.userData.spin=new THREE.Vector3((col%2?1:-1)*.4,.1*row,.2*(col-4));
      world.add(mesh);this.shards.push(mesh);
    }
    this.sleigh=new THREE.Group();this.sleigh.visible=false;scene.add(this.sleigh);
    this.trailGeo=new THREE.BufferGeometry();this.trailPositions=new Float32Array(120*3);this.trailGeo.setAttribute('position',new THREE.BufferAttribute(this.trailPositions,3));
    this.trail=new THREE.Points(this.trailGeo,new THREE.PointsMaterial({color:0xffd38b,size:.045,transparent:true,opacity:.7,depthWrite:false}));this.trail.visible=false;scene.add(this.trail);
    view.dataset.sleigh='loading';
    this.ready=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('./models/treno-natal.glb').then(gltf=>{
      gltf.scene.traverse(o=>{if(o.isLight)o.intensity=0;if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
      this.sleigh.add(gltf.scene);view.dataset.sleigh='higgsfield';window.FlashClipBoot?.report('sleigh');this.onChange();
    }).catch(error=>{view.dataset.sleigh='unavailable';throw error;});
    // O host aguarda a Promise; anexar já evita rejeição sem observador no intervalo.
    this.ready.catch(()=>{});
  }
  start(){this.reset();this.active=true;this.view.dataset.entryPhase='idle';this.onChange();}
  hit(count,reduced){
    if(!this.active||this.playing)return;
    this.count=count;this.cracks.visible=count<5;
    this.cracks.children.forEach(line=>{line.visible=count>=line.userData.level;});
    this.view.dataset.entryPhase=count===5?'breaking':'cracking';
    this.view.dataset.cracks=String(count);
    if(count===5){
      if(reduced){this.complete();return;}
      this.playing=true;this.elapsed=0;this.glass.visible=false;
      this.shards.forEach(mesh=>{mesh.visible=true;mesh.position.copy(mesh.userData.origin);});
    }
    this.onChange();
  }
  flightPoint(t) {
    return new THREE.Vector3(-4.7+9.4*t,1.55+.5*Math.sin(t*Math.PI),2.35+.25*Math.sin(t*Math.PI));
  }
  update(dt) {
    if(this.landing){
      const t=Math.min(1,(performance.now()-this.landStarted)/this.landDuration);
      const ease=1-Math.pow(1-t,3);
      this.pivot.scale.setScalar(this.landScale+(1-this.landScale)*ease);
      this.glass.material.uniforms.fade.value=ease;
      if(t===1){this.landing=false;this.playing=false;}
      return;
    }
    if(!this.playing||this.ended)return;
    this.elapsed+=dt;const time=this.elapsed;
    for(const mesh of this.shards){
      mesh.position.copy(mesh.userData.origin).addScaledVector(mesh.userData.velocity,time);
      mesh.position.y-=time*time*.85;
      mesh.rotation.set(mesh.userData.spin.x*time,mesh.userData.spin.y*time,mesh.userData.spin.z*time);
      mesh.material.uniforms.fade.value=Math.max(0,1-time/1.2);
      mesh.visible=time<1.2;
    }
    const shrink=THREE.MathUtils.smoothstep(time,1,3.7);
    this.pivot.scale.setScalar(1-shrink*.4);
    if(time>.75){
      if(!this.flySound){this.flySound=true;window.dispatchEvent(new CustomEvent('fc:sleigh-fly'));}
      const t=Math.min(1,(time-.75)/3.7);
      this.sleigh.visible=this.sleigh.children.length>0;
      this.sleigh.position.copy(this.flightPoint(t));
      this.sleigh.scale.setScalar(.43+Math.sin(t*Math.PI)*.18);
      this.sleigh.rotation.set(.05,-.18,-.06+Math.sin(t*Math.PI)*.08);
      this.trail.visible=this.sleigh.visible;
      for(let i=0;i<120;i++){
        const past=Math.max(0,t-i*.0017),p=this.flightPoint(past);
        this.trailPositions.set([p.x-.7+Math.sin(i*7.1)*.13,p.y-.15+Math.cos(i*4.7)*.12,p.z+Math.sin(i*2.9)*.1],i*3);
      }
      this.trailGeo.attributes.position.needsUpdate=true;
      this.view.dataset.entryPhase='flying';
    }
    if(time>=4.5)this.complete();
  }
  complete(){if(this.ended)return;this.ended=true;this.playing=false;this.view.dataset.entryPhase='complete';this.onComplete();}
  land(duration=1500){
    this.active=false;this.playing=true;this.landing=true;
    this.landStarted=performance.now();this.landDuration=Math.max(1,duration);this.landScale=this.pivot.scale.x;
    this.cracks.visible=false;this.shards.forEach(mesh=>{mesh.visible=false;});
    this.sleigh.visible=false;this.trail.visible=false;this.glass.visible=true;this.glass.material.uniforms.fade.value=0;
    this.view.dataset.entryPhase='landing';this.onChange();
  }
  reset(){
    this.active=false;this.playing=false;this.landing=false;this.flySound=false;this.ended=false;this.count=0;this.elapsed=0;
    this.cracks.visible=false;this.shards.forEach(mesh=>{mesh.visible=false;mesh.rotation.set(0,0,0);mesh.material.uniforms.fade.value=1;});
    this.glass.visible=true;this.glass.material.uniforms.fade.value=1;this.pivot.scale.setScalar(1);this.sleigh.visible=false;this.trail.visible=false;
    this.view.dataset.cracks='0';this.view.dataset.entryPhase='inactive';
  }
}
