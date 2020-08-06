<script lang="ts">
	let svgInput: string;
  let svgOutput: string;
  let canvasElement : HTMLCanvasElement;
  let isCopiedToClipboard: boolean = false;

  function copy() {
    canvasElement.toBlob((blob) => {
      let data = [new ClipboardItem({ [blob.type]: blob })];
      navigator.clipboard.write(data).then(() => isCopiedToClipboard = true);
    }, 'image/png');
  }

  function adjustSVG(svgStr : string) {
    const container = document.createElement('div');
    container.innerHTML = svgStr;
    const svgEl = container.firstElementChild;
    svgEl.setAttribute('width', '600');
    svgEl.setAttribute('height', '600');
    svgEl.setAttribute('viewBox', '0 0 600 600');
    svgEl.removeChild(svgEl.querySelector('rect'));
    svgEl.querySelector('g').removeAttribute('transform');

    return new XMLSerializer().serializeToString(svgEl);
  }

  function drawImage(svgStr : string) {
    return new Promise((resolve) => {
      const ctx = canvasElement.getContext('2d');
      ctx.clearRect(0, 0, 600, 600);
      const img = new Image();
      const svgBlob = new Blob([svgStr], {type: "image/svg+xml;charset=utf-8"});
      const imgUrl = URL.createObjectURL(svgBlob);
      img.onload = function() {
        ctx.drawImage(img, 0, 0);
        resolve();
      };
      img.src = imgUrl;
    });
  }

  async function convert(e : Event) {
    e.preventDefault();
    const svgPattern = /data:image\/svg\+xml;base64,([\w+=]+)/;
    const base64str = svgInput.match(svgPattern)?.[1];
    if (!base64str) {
      throw new Error('Unable to find SVG base64 string');
    }
    const rawSvgStr = atob(base64str);
    const svgStr = adjustSVG(rawSvgStr);
    svgOutput = svgStr;

    await drawImage(svgStr);
    copy();
  }
</script>

<main>
  <header>
    <h1>svg2png</h1>
    <p>Takes a SVG string and converts to transparent PNG</p>
  </header>
  <section>
    <form>
      <textarea bind:value={svgInput} placeholder="Paste SVG base64 URL here:
<div style='background-image: data:image/svg+xml;base64,...'>
data:image/svg+xml;base64,..."></textarea>
      <button on:click={convert}>Convert</button>
      {#if isCopiedToClipboard}
        <span>Image copied!</span>
      {/if}
    </form>
  </section>
  <section>
    {#if svgOutput}
      <header><h2>PNG</h2></header>
    {/if}
    <canvas bind:this={canvasElement} width="600px" height="600px"></canvas>
  </section>
  {#if svgOutput}
    <section>
      <header><h2>SVG</h2></header>
      {@html svgOutput}
    </section>
  {/if}
</main>

<style>
  textarea {
    width: 30rem;
    height: 10rem;
  }
</style>
