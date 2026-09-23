import React, { useEffect, useRef } from 'react';

export const WebGLBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const vsSrc = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    
    // Pure black & white / monochrome shader with 0.2 opacity / subtle intensity
    const fsSrc = `
      precision mediump float;
      uniform vec2 u_res;
      uniform float u_time;
      float band(float x,float c,float w){float d=(x-c)/w;return exp(-d*d);}
      void main(){
        vec2 uv = gl_FragCoord.xy / u_res;
        float t = u_time * 0.08;
        
        // Pure dark neutral background
        vec3 base = mix(vec3(0.02, 0.02, 0.025), vec3(0.04, 0.04, 0.045), uv.y);
        
        float x = uv.x + (1.0 - uv.y) * (-0.35);
        float topFade = pow(uv.y, 1.8);
        
        // Pure white & silver highlights (Monochrome)
        vec3 white = vec3(0.95, 0.95, 0.98);
        vec3 glow = vec3(0.45, 0.45, 0.50);
        
        float r = 0.0;
        r += 0.85 * band(x, 0.30 + 0.06 * sin(t * 1.3), 0.055 + 0.015 * sin(t * 0.7));
        r += 0.55 * band(x, 0.44 + 0.05 * sin(t * 0.9 + 2.0), 0.10);
        r += 0.40 * band(x, 0.62 + 0.07 * sin(t * 1.1 + 4.0), 0.16);
        r += 0.30 * band(x, 0.16 + 0.04 * sin(t * 0.8 + 1.0), 0.09);
        r += 0.25 * band(x, 0.85 + 0.05 * sin(t * 1.4 + 3.0), 0.14);
        
        float shimmer = 0.5 + 0.5 * sin(u_time * 0.4 + uv.x * 6.0);
        vec3 col = base + glow * r * topFade * 0.7 + white * r * r * topFade * 0.35 * (0.7 + 0.3 * shimmer);
        col += white * 0.05 * pow(max(0.0, uv.y - 0.75) * 4.0, 2.0) * band(x, 0.35 + 0.05 * sin(t), 0.25);
        
        float vg = smoothstep(1.35, 0.35, distance(uv, vec2(0.5, 0.55)));
        col *= mix(0.75, 1.0, vg);
        
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    function createShader(type: number, src: string) {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      return s;
    }

    const prog = gl.createProgram()!;
    gl.attachShader(prog, createShader(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(prog, createShader(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uTime = gl.getUniformLocation(prog, 'u_time');

    function resize() {
      if (!canvas || !gl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    window.addEventListener('resize', resize);
    resize();

    let animId: number;
    function frame(t: number) {
      if (!gl || !canvas) return;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      animId = requestAnimationFrame(frame);
    }

    animId = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* WebGL Canvas with strictly 0.2 opacity */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover"
        style={{ opacity: 0.2 }}
        aria-hidden="true"
      />
      {/* Diagonal hatch overlay from reference */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(115deg,rgba(255,255,255,0.015) 0px,rgba(255,255,255,0.015) 1px,transparent 1px,transparent 56px)',
        }}
        aria-hidden="true"
      />
    </div>
  );
};

export default WebGLBackground;
