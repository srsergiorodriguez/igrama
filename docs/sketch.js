const data = ['estructura','gramatica','generador'];
const rectw = 100, recth = 50;
const m = 50;
const w = m + data.length * (rectw + m);
d3.select('#esquema-container').style("width", w+'px');
const svg = d3.select("#svg").attr("width", w).attr("height", recth + (m * 2));

const estructura = svg.append('g')
  .attr("transform",`translate(${m}, ${m})`)
  .selectAll("g")
  .data(data)
  .enter().append("g")
  .attr("transform",(_,i)=>`translate(${i * (m + rectw)},0)`)
  .on("click", function(_, d) {
    window.location.href = `./${d}`;
  })

estructura.append("rect")
  .attr("width",100)
  .attr("height",50)
  .attr("rx",5)
  .classed("node-rect",true)

estructura.append("text")
  .attr("transform",`translate(${rectw/2},${recth*0.6})`)
  .text((d,i) => `${i+1}) ${d}`)
  .attr("text-anchor","middle")
  .style("font-size",14)

svg.selectAll('line')
  .data(data.slice(0,2))
  .enter().append('line')
  .attr("transform",(_,i)=>`translate(${(i + 1) * (m + rectw)},${m + (recth/2)})`)
  .attr('x1', 0)
  .attr('x2', m)
  .attr('y1', 0)
  .attr('y2', 0)
  .classed("node-arrow",true)

d3.select('footer').text(`${version} por Sergio Rodríguez Gómez`);

function setup() {
  noCanvas();
  select('#zip-drop').drop((file) => {
    if (file.subtype)
      processZip(file.data);
  });
}

async function processZip(data) {
  const {grammar, igrama} = await readZipFiles(data);
  const a = new Aventura();
  Object.assign(igrama.grammar, grammar);
  a.saveJSON(igrama, "igrama.json");
}

async function readZipFiles(path) {
  const bin = await binaryZipContent(path);
  const zip = new JSZip();
  const data = await zip.loadAsync(bin);
  const files = data.files;
  const filenames = Object.keys(files);
  let igrama;
  const grammar = {};
  for (let filename of filenames) {
    const file = files[filename];
    const match = /png|jpg/.exec(filename);
    if (match !== null) {
      const format = match[0];
      const foldername = filename.split('/')[1];
      if (grammar[foldername] === undefined) {
        grammar[foldername] = [];
      }
      const dataUrl = await base64Img(file, format);
      grammar[foldername].push(`url%%${dataUrl}%%`);
    }
    if (/json/.test(filename) && !/_/.test(filename)) {
      igrama = JSON.parse(await file.async("text"));
    }
  }

  return {grammar, igrama}
}

async function binaryZipContent(path) {
  const bin = await new Promise((r) => {
    JSZipUtils.getBinaryContent(path, (_, data) => {
      r(data);
    });
  })
  return bin
}

async function base64Img(file) {
  const data = await file.async("base64");
  const dataUrl = "data:image/png;base64," + data; 
  return dataUrl
}

async function getObjectUrl(file) {
  return await file.async("blob").then((blob) => URL.createObjectURL(blob));
}

async function showImg(path, container) {
  const img = await loadImg(path);
  const canvas = document.createElement('canvas');
  canvas.width  = img.width;
  canvas.height = img.height;
  const context = canvas.getContext("2d");
  context.drawImage(img, 10, 10);
  if (container) {
    document.getElementById(container).appendChild(canvas);
  } else {
    document.body.appendChild(canvas);
  } 
}

async function loadImg(path) {
  const img = new Image();
  img.src = path;
  return new Promise(r => {img.onload = function() {r(img)}});
}
