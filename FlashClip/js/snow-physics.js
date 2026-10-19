/* Simulação local de neve: passo fixo, gravidade, amortecimento e parede esférica. */
export class SnowPhysics {
  constructor(count = 820, seed = 147) {
    this.count = count;
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.floor = .83;
    this.center = 1.95;
    this.radius = 1.88;
    this.seed = seed;
    this.active = count;
    for (let i = 0; i < count; i++) {
      const angle = this.random() * Math.PI * 2;
      const r = Math.sqrt(this.random()) * 1.46;
      this.positions.set([Math.cos(angle) * r, this.floor + this.random() * .03, Math.sin(angle) * r], i * 3);
    }
  }
  random() { this.seed = (Math.imul(1664525, this.seed) + 1013904223) >>> 0; return this.seed / 4294967296; }
  shake(force = 1) {
    for (let i = 0; i < this.count; i++) {
      const j = i * 3, angle = this.random() * Math.PI * 2;
      this.velocities[j] = Math.cos(angle) * (1 + this.random() * 1.6) * force;
      this.velocities[j+1] = (2.7 + this.random() * 2.6) * force;
      this.velocities[j+2] = Math.sin(angle) * (1 + this.random() * 1.6) * force;
    }
    this.active = this.count;
  }
  scatter() {
    for (let i = 0; i < this.count; i++) {
      const j = i * 3;
      let x, y, z;
      do { x = (this.random()-.5)*4; z = (this.random()-.5)*4; y = this.floor + this.random()*3.2; }
      while (x*x + (y-this.center)**2 + z*z > this.radius*this.radius);
      this.positions.set([x,y,z],j);
      this.velocities.fill(0,j,j+3);
    }
    this.active = this.count;
  }
  step(dt) {
    const drag = Math.exp(-1.15 * dt), p = this.positions, v = this.velocities;
    let active = 0;
    for (let i = 0; i < this.count; i++) {
      const j = i*3;
      if (p[j+1] <= this.floor+.005 && Math.abs(v[j])+Math.abs(v[j+1])+Math.abs(v[j+2]) < .025) continue;
      active++;
      v[j] *= drag; v[j+2] *= drag;
      v[j+1] = (v[j+1] - .58*dt) * Math.exp(-.3*dt);
      // Leve corrente circular, sem fonte permanente de energia.
      const swirl = Math.min(1, Math.abs(v[j+1]))*.14;
      v[j] += p[j+2]*swirl*dt; v[j+2] -= p[j]*swirl*dt;
      p[j] += v[j]*dt; p[j+1] += v[j+1]*dt; p[j+2] += v[j+2]*dt;
      const dx=p[j], dy=p[j+1]-this.center, dz=p[j+2], distance=Math.hypot(dx,dy,dz);
      if(distance>this.radius) {
        const nx=dx/distance, ny=dy/distance, nz=dz/distance;
        p[j]=nx*this.radius; p[j+1]=this.center+ny*this.radius; p[j+2]=nz*this.radius;
        const dot=v[j]*nx+v[j+1]*ny+v[j+2]*nz;
        if(dot>0) { v[j]-=1.25*dot*nx; v[j+1]-=1.25*dot*ny; v[j+2]-=1.25*dot*nz; }
      }
      if(p[j+1]<this.floor) {
        p[j+1]=this.floor;
        v[j+1]=0; v[j]*=.65; v[j+2]*=.65;
      }
    }
    this.active=active;
  }
}
