// WebGL 2.0 APIをラッピングするクラス


class GL2 {
  constructor(gl) {
    this.gl = gl;
  }

  // shaderSrcとtypeでWebGLShaderを作り返す
  createShader(shaderSrc, type) {
    // WebGL2RenderingContextコンテキスト
    const gl = this.gl;
    // WebGLShaderの生成
    const shader = gl.createShader(type);
    // WebGLShaderにシェーダーソースコードをセットする
    gl.shaderSource(shader, shaderSrc);
    // シェーダーソースコードをコンパイルする
    gl.compileShader(shader);
    // シェーダーのコンパイルが失敗した場合は例外を送出する
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  // フレームバッファをオブジェクトとして生成する関数
  createFrameBuffer(width, height){
    const gl = this.gl;
    // フレームバッファの生成
    const frameBuffer = gl.createFramebuffer();
    
    // フレームバッファをWebGLにバインド
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    
    // 深度バッファ用レンダーバッファの生成とバインド
    const depthRenderBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderBuffer);
    
    // レンダーバッファを深度バッファとして設定
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
    
    // フレームバッファにレンダーバッファを関連付ける
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRenderBuffer);
    
    // フレームバッファ用テクスチャの生成
    const fTexture = gl.createTexture();
    
    // フレームバッファ用のテクスチャをバインド
    gl.bindTexture(gl.TEXTURE_2D, fTexture);
    
    // フレームバッファ用のテクスチャにカラー用のメモリ領域を確保
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    
    // テクスチャパラメータ
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    
    // フレームバッファにテクスチャを関連付ける
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fTexture, 0);
    
    // 各種オブジェクトのバインドを解除
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    // オブジェクトを返して終了
    return {frameBuffer : frameBuffer, depthBuffer : depthRenderBuffer, texture : fTexture};
  }

  // 2つのWebGLShader（頂点シェーダ・フラグメントシェーダ）
  // からWebGLProgramを作り返す
  createProgram(vs, fs) {

    // WebGL2RenderingContextコンテキスト
    const gl = this.gl;

    if(typeof vs == 'string'){
      vs = this.createShader(vs,gl.VERTEX_SHADER);
    }

    if(typeof fs == 'string'){
      fs = this.createShader(fs,gl.FRAGMENT_SHADER);
    }

    // WebGLProgramの作成
    const program = gl.createProgram();
    // 頂点シェーダをアタッチする
    gl.attachShader(program, vs);
    // フラグメントシェーダをアタッチする
    gl.attachShader(program, fs);
    // シェーダーをリンクする
    gl.linkProgram(program);
    // リンクが失敗したら例外を送出する
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program));
    }
    return program;
  }

  loadImage(url) {
    return new Promise((resolve,reject)=>{
      var image = new Image();
      try {
        image.src = url;
        image.onload = ()=>{
          resolve(image);
        };
      } catch (e){
        reject(e);
      }
     });
  }

  createTexture(url){

  }
}

export default GL2;
