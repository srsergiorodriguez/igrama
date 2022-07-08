class MiniGif {
  /* 
  MiniGif 
  v.1.0.1
  By Sergio Rodríguez Gómez
  MIT LICENSE
  https://github.com/srsergiorodriguez/
  */
  constructor(options = {}) {
    this.colorResolution = Math.max(1, Math.min(7, options.colorResolution || 2));
    this.colorTableSize = Math.pow(2, this.colorResolution + 1);
    this.colorTableBytes = this.colorTableSize * 3;
    this.customPalette = options.customPalette || undefined;
    this.fileName = options.fileName || 'minigif';

    this.delay = options.delay || 50;
    this.transparent = options.transparent || false;
    this.transparentIndex = options.transparentIndex || 0;
    this.dither = options.dither || false;

    this.width;
    this.height;

    this.globalColorTable;
    this.framesPixels = [];
    this.framesImageData = [];
    this.allPixels = []; // para poner todos los pixels de todas las imágenes y hacer la quantización
  }

  async addFrameFromPath(path) {
    const img = new Image();
    img.src = path;
    await new Promise(r => {img.onload = function() {r(true)}});
    this.addFrame(img);
  }

  addFrame(frame) {
    let canvas;
    let context;
    if (frame instanceof HTMLCanvasElement) {
      canvas = frame;
      context = canvas.getContext("2d");
    } else if (frame instanceof HTMLImageElement) {
      const img = frame;
      canvas = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      context = canvas.getContext("2d");
      context.drawImage(img, 0, 0);
      img.remove();
    } else {
      console.error(`Frame must be a canvas or img element.
      If you want to add a frame from an image path use addFrameFromPath async function`);
    }

    if (this.width === undefined || this.height === undefined) {
      this.width = canvas.width;
      this.height = canvas.height;
    }
  
    const imageDataObject = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageDataObject.data;
    this.framesPixels.push(pixels);

    this.allPixels = [...this.allPixels, ...pixels];

    if (!(frame instanceof HTMLCanvasElement)) {
      canvas.remove();
    }
    return pixels
  }

  makeGif() {
    const colors = this.customPalette || this.medianCutColors(this.allPixels);
    this.globalColorTable = this.getColorTable(colors);
    const codeTableData = this.getCodeTable(colors);
    this.quantizeFunction = this.dither ? this.errorDiffusionDither : this.simpleQuantize;

    for (let i = 0; i < this.framesPixels.length; i++) {
      const indexStream = this.quantizeFunction(this.framesPixels[i], colors);
      const codeStream = this.getCodeStream(indexStream, codeTableData);
      this.framesImageData[i] = this.getImageData(codeStream);
    }

    const binaryBuffer = this.structureGif();
    return binaryBuffer
  }

  getColorTable(colors) {
    return new Uint8Array(colors.flat());
  }

  getCodeTable(colors) {
    const codeTableDict = {};
    for (let i = 0; i < colors.length; i++) {
      codeTableDict[i] = i;
    }
    codeTableDict[colors.length] = 'CC';
    codeTableDict[colors.length + 1] = 'EOI';
    return {CCindex: colors.length, EOIindex: colors.length + 1, codeTableDict}
  }

  getCodeStream(indexStream, codeTableData) {
    // codifica el indexStream usando el algoritmo LZW y ajusta los tamaños de los códigos variables
    let {CCindex, EOIindex, codeTableDict} = JSON.parse(JSON.stringify(codeTableData));
    const resetCodeTableData = JSON.parse(JSON.stringify(codeTableData));
    const minimumCodeSize = Math.max(2, this.colorResolution + 1);
    let lastCodeSize;
    let streamStart = 0;

    ///////
    const byteSize = 8;
    let bytesStream = [0];
    const bytemask = 0b11111111;
    let numCount = 0; // counter of current byte being written
    let displace = 0;
    
    function addCode(code, codeSize) {
      const newCode = code << displace;
      const bitsAvailable = byteSize - displace; // bits available in current byte
      if (bitsAvailable <= codeSize) { // there is not enough space for new code in byte
        bytesStream[numCount] = (bytesStream[numCount] | newCode) & bytemask; // add all bits possible and crop

        let fraction = code >>> bitsAvailable;
        let tempDisplace = codeSize - bitsAvailable;
        numCount++; // advance to next byte
        bytesStream[numCount] = fraction & bytemask;

        while (tempDisplace >= byteSize) {
          fraction = fraction >>> byteSize;
          numCount++; // advance to next byte
          bytesStream[numCount] = fraction & bytemask;
          tempDisplace -= byteSize;
        }
        displace = tempDisplace;
      } else { // there is space for complete new code in byte
        bytesStream[numCount] = bytesStream[numCount] | newCode;
        displace += codeSize;
      }
    }

    ///////
    addCode(CCindex, minimumCodeSize + 1);
    while (streamStart <= indexStream.length) {
      codeTableDict = JSON.parse(JSON.stringify(resetCodeTableData.codeTableDict));
      let currentCodeSize = minimumCodeSize + 1;
      let codeLengthCounter = EOIindex;
  
      let indexBuffer = indexStream[streamStart];
      let i = streamStart + 1;
      while (codeLengthCounter < Math.pow(2,12) && i < indexStream.length) {
        const k = indexStream[i];
        const combination = `${indexBuffer},${k}`;
        if (codeTableDict[combination] !== undefined) {
          indexBuffer = combination;
        } else {
          codeLengthCounter++;
          if (codeLengthCounter >= Math.pow(2, currentCodeSize) + 1) currentCodeSize++;
          const dictValue = codeTableDict[indexBuffer];
          codeTableDict[combination] = codeLengthCounter;
          addCode(dictValue, currentCodeSize);
          indexBuffer = k;
        }
        i++;
      }

      addCode(codeTableDict[indexBuffer], currentCodeSize);
      streamStart = i;
      if (i >= indexStream.length) {
        lastCodeSize = currentCodeSize;
        break
      }
      addCode(CCindex, currentCodeSize);
    }
    addCode(EOIindex, lastCodeSize);
    return new Uint8Array(bytesStream)
  }

  getImageData(bytesStream) {
    // une los bits que tienen largos variables en bytes
    let bytes = bytesStream

    const minimumCodeSize = Math.max(2, this.colorResolution + 1); // LZW minimum code size, esto va primero en el imageData
    // bloques de máximo 255 bytes, antecedidos por el tamaño. Entonces total 256 bytes máx
    const maxBlockSize = 255;
    const divs = bytes.length / maxBlockSize;
    const ceilDivs = Math.ceil(divs); // Número de bloques necesarios
    // Tamaño del buffer que es necesario reservar, incluyendo minimumCodeSize, bloques y sus tamaños, y block terminator
    const bufferSize = Math.ceil((divs*(maxBlockSize+1))+2);
    const imageData = new Uint8Array(bufferSize);

    imageData[0] = minimumCodeSize;
    let cursor = 1;
    for (let i = 0; i < ceilDivs; i++) {
      let block = bytes.slice(i * maxBlockSize, (i + 1) * maxBlockSize);
      const blockSize = i < ceilDivs - 1 ? maxBlockSize : block.length;
      imageData.set([blockSize], cursor);
      imageData.set(block, cursor + 1);
      cursor += blockSize + 1;
    }
    imageData[bufferSize - 1] = 0; // block terminator, esto muestra que terminó el imageData
    return new Uint8Array(imageData)
  }

  download(buffer) {
    const blob = new Blob([buffer]);
    const fileName = `${this.fileName}.gif`;
    if (navigator.msSaveBlob) {
      navigator.msSaveBlob(blob, fileName);
    } else {
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }

  structureGif() {
    const packedField = parseInt(`1${this.toBin(this.colorResolution, 3)}0${this.toBin(this.colorResolution,3)}`, 2);
    const header = concatArrayBuffers(...[
      //header
      rawString('GIF89a'),
      // logical screen descriptor
      U16LE(this.width),
      U16LE(this.height),
      U8(packedField),
      U8(0),
      U8(0)
    ]);
  
    // global color table here

    const loopRepetitions = 0; // 0 es infinito
    const applicationExtension = concatArrayBuffers(...[
      U8(33), // 33 (hex 0x21) GIF Extension code
      U8(255), // 255 (hex 0xFF) Application Extension Label
      U8(11), // 11 (hex 0x0B) Length of Application Block
      rawString('NETSCAPE2.0'),
      U8(3), // 3 (hex 0x03) Length of Data Sub-Block
      U8(1), // 1 (hex 0x01)
      U16LE(loopRepetitions),
      U8(0) // terminator
    ]);

    // PARA CADA IMAGEN DE LA ANIMACIÓN HAY QUE HACER ESTAS TRES: graphicsColorExtension, imageDescriptor, imageData
    const transparentFlag = this.transparent === true ? 1 : 0;
    const disposal = 1; // forma en la que se dibujan las siguientes imágenes 1 es dibujar encima, 2 es borrar el canvas, 3 restore
    const graphicsControlPackedField = parseInt(`00000${disposal}0${transparentFlag}`, 2);
    const imageDescriptorPackedField = parseInt(`000000000`, 2);

    const globalImageData = [];
    for (let i = 0; i < this.framesImageData.length; i++) {

      const graphicsControlExtension = concatArrayBuffers(...[
        U8(33), // Extension introducer - always 21 hex
        U8(249), // Graphic Control label - always f9 hex
        U8(4), // Byte size
        U8(graphicsControlPackedField),
        U16LE(this.delay), // Delay time
        U8(this.transparentIndex), // Transparent color index
        U8(0) // Block terminator - always 0
      ]);
      globalImageData.push(graphicsControlExtension);
      
      const imageDescriptor = concatArrayBuffers(...[
        U8(44), // Image Separator - always 2C hex
        U16LE(0), // Image left,
        U16LE(0), // ImageTop,
        U16LE(this.width), // Width,
        U16LE(this.height), // Height
        U8(imageDescriptorPackedField),
      ]);

      globalImageData.push(imageDescriptor);

      // image data here
      globalImageData.push(this.framesImageData[i]);
    }
    
    const trailer = new Uint8Array([59]) // 3b hex semicolon indicating end of file
  
    const gifFile = concatArrayBuffers(...[
      header,
      this.globalColorTable,
      applicationExtension,
      ...globalImageData,
      trailer
    ]);
    
    return gifFile

    // ARRAYBUFFER HELPERS
    function concatArrayBuffers(...bufs){
      const result = new Uint8Array(bufs.reduce((totalSize, buf)=>totalSize+buf.byteLength,0));
      bufs.reduce((offset, buf)=>{
        result.set(buf,offset);
        return offset+buf.byteLength
      },0)
      return result
    }

    function U16LE(v) {
      const bytes = v.toString(2).padStart(16,'0');
      const a = parseInt(bytes.slice(0, 8), 2);
      const b = parseInt(bytes.slice(-8), 2);
      return new Uint8Array([b, a]);
    }

    function U8(v) { return new Uint8Array([v]) }

    function rawString(str) {
      const buffer = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        buffer[i] = str.slice(i, i+1).charCodeAt(0);
      }
      return buffer
    }
  }

  /// IMAGE MANIPULATION
  errorDiffusionDither(pixels, colors) {
    const errorDiff = [7,3,5,1];
    const nIndexes = [[1,0],[-1, 1],[0, 1],[1, 1]];
    const calculateError = (c1, c2) => c1.map((d, i) => d - c2[i]);

    const indexStream = new Uint8Array(pixels.length / 4);
    let cursor = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const currentPixel = pixels.slice(index, index + 3);  
      const colorIndex = this.findClosest(currentPixel, colors);
      const closest = colors[colorIndex];
      const error = calculateError(currentPixel, closest);

      for (let i = 0; i < 3; i++) { pixels[index + i] = closest[i] }
      
      const x = Math.floor(index % this.width);
      const y = Math.floor(index / this.width);
      for (let j = 0; j < nIndexes.length; j++) {
        const nh = (x + (nIndexes[j][0]) * 4) + ((y + (nIndexes[j][1]) * 4) * this.width);
        for (let i = 0; i < 3; i++) {
          pixels[nh + i] = pixels[nh + i] + ((error[i] * errorDiff[i]) >> 4);
        }
      }
      indexStream[cursor] = colorIndex;
      cursor++;
    }

    return indexStream
  }

  simpleQuantize(pixels, colors) {
    // returns image data object and index stream of colors in color table
    const indexStream = new Uint8Array(pixels.length / 4);
    let cursor = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const currentPixel = [pixels[index + 0], pixels[index + 1], pixels[index + 2]];
      const colorIndex = this.findClosest(currentPixel, colors);
      indexStream[cursor] = colorIndex;
      cursor++;     
    }
    return indexStream
  }

  findClosest(c, colors) {
    let index = 0;
    let minDistance = Number.MAX_VALUE;
    for (let i = 0; i < colors.length; i++) {
      const distance = this.euclideanDistance(c, colors[i]);
      if (distance < minDistance) {
        minDistance = distance;
        index = i;
      }
    }
    return index
  }
  
  euclideanDistance(c1, c2) {
    const a = c1[0] - c2[0];
    const b = c1[1] - c2[1];
    const c = c1[2] - c2[2];
    return ((a * a) + (b * b) + (c * c));
  }

  medianCutColors(pixels) {
    const targetBins = this.colorTableSize;
  
    const cols = [];  
    let counter = 0;
    const nrRandoms = Math.max(1000,Math.floor(2*pixels.length/1000));
    const drops = new Array(nrRandoms).fill(0).map(() => Math.random() > 0.02); // Una secuencia de booleanos aleatorios para no calcular tantas veces
    for (let i = 0; i < pixels.length; i+=4) { // crear el primer bin a partir de los pixels
      if (drops[i%1000]) continue // salta pixels para hacer más pequeña la muestra
      cols[counter] = [];
      for (let j = 0; j < 3; j++) {
        cols[counter][j] = pixels[i + j];
      }
      counter++;
    }
  
    // recursion
    const bins = medianCutRecursion([cols], targetBins);
    return averageBins(bins);
  
    function averageBins() {
      const averages = [];
      for (let bin of bins) {
        const channels = {r:[], g:[], b:[]};
        for (let ch of bin) {
          channels.r.push(ch[0]);
          channels.g.push(ch[1]);
          channels.b.push(ch[2]);
        }
        const avg = [stats(channels.r).avg, stats(channels.g).avg, stats(channels.b).avg];
        averages.push(avg);
      }
      return averages
    }
  
    function medianCutRecursion(bins, targetBins) {
      if (bins.length >= targetBins) return bins

      let newBins = [];
      for (let bin of bins) {
        const channels = {r:[], g:[], b:[]};
        for (let ch of bin) {
          channels.r.push(ch[0]);
          channels.g.push(ch[1]);
          channels.b.push(ch[2]);
        }
        const maxRangeI = stats([stats(channels.r).range, stats(channels.g).range, stats(channels.b).range]).maxI; // index of channel with maxrange
        const sorted = bin.sort((a, b)=> a[maxRangeI] - b[maxRangeI]); // ascendente
        const half = Math.floor(sorted.length/2);
        newBins.push(
          sorted.slice(0, half), // primera mitad
          sorted.slice(half) // segunda mitad
        )
      }
      return medianCutRecursion(newBins, targetBins);
    }

    function stats(arr) {
      let max = -Number.MAX_VALUE, min = Number.MAX_VALUE;
      let minI = 0, maxI = 0;
      let sum = 0;
      arr.forEach((e, i) => {
        sum += e;
        if (max < e) {
          max = e;
          maxI = i;
        }
        if (min > e) {
          min = e;
          minI = i;
        }
      })
      return {min, max, minI, maxI, range: max-min, avg: Math.floor(sum/arr.length)}
    }
  }

  // HELPERS
  getIndex(r, table) {
    let index = 0;
    for (let i = 0; i < table.length; i++) {
      const t = table[i];
      let isCol = true;
      for (let j = 0; j < r.length; j++) {
        if (r[j] !== t[j]) isCol = false;
      }
      if (isCol) {
        index = i;
        break
      }
    }
    return index
  }

  toBin(v, pad = 0) {return (v).toString(2).padStart(pad,'0')}
}