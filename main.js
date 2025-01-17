// ===============
// MAIN GRIDS CODE
// ===============

// global state
let mixed;
let step = 0;
let run = false;
let bpm = 120;

/**
 * Collection of state
 * - 0: X
 * - 1: Y
 * - 2: Fill 1
 * - 3: Fill 2
 * - 4: Fill 3
 */
let cv = [0, 0, 0, 0, 0];

function U8Mix(a, b, x) {
  return x * b + (0xFF - x) * a >> 8;
}

function calculateMixed() {
  const xpage = cv[3] >> 6;
  const xbalance = (cv[3] << 2) & 0xFF;
  const ypage = cv[4] >> 6;
  const ybalance = (cv[4] << 2) & 0xFF;

  mixed = [];
  for (i = 0; i < 96; i++) {
    const a = drum_map[(xpage + 0) * 5 + ypage + 0][i];
    const b = drum_map[(xpage + 1) * 5 + ypage + 0][i];
    const c = drum_map[(xpage + 0) * 5 + ypage + 1][i];
    const d = drum_map[(xpage + 1) * 5 + ypage + 1][i];
    mixed[i] = U8Mix(U8Mix(a, b, xbalance), U8Mix(c, d, xbalance), ybalance);
  }

  return {xpage, xbalance, ypage, ybalance}
}

// ==================
// URL PARAM HANDLING
// ==================

// get settings from URL
const searchParams = new URLSearchParams(location.search);
if (incv = searchParams.get("cv")) {
  incv = incv.split(",");
  if (incv.length == 5) {
    for (i = 0; i < 5; i++) {
      cv[i] = +incv[i] & 255;
      d3.select("[data-key='" + i + "']").property("value", cv[i]);
      d3.select("#value-" + i + "").text(cv[i]);
    }
  }
}

// ================
// D3 / VIZ DRAWING
// ================

const svg = d3.select("svg");
const color = d3.scaleLinear().domain([0, 0xFF]).range(['white', 'blue']);

function fill(d, i) {
  return run && step == (i % 32) && (d > (0xFF ^ cv[Math.floor(i / 32)])) ?
    'orange' : color(d);
}

function update() {
  const {xpage, xbalance, ypage, ybalance} = calculateMixed()

  d3.select("#coordinates").text(xpage + ":" + xbalance + "," + ypage + ":" + ybalance);

  svg.selectAll('.cell').data(mixed);
  svg.selectAll('.cell')
    .style('stroke', function (d, i) {
      // javascripts ~ op gives the 1's compliment for some reason
      // so we xor the cv value with 0xFF for both inversions instead
      return (d > (0xFF ^ cv[Math.floor(i / 32)])) ? 'black' : 'lightgray';
    })
    .style('stroke-width', function (d, i) {
      return (d > 192 && d > (0xFF ^ cv[Math.floor(i / 32)])) ? 3 : 1;
    })
    .style('fill', color);

  const url = new URL(location.href);
  const permalink = url.origin + url.pathname + "?cv=" + cv.join(",");
  d3.select("#permalink").attr('href', permalink);
}

svg.append("g").attr('transform', 'translate(10,30)').selectAll('.cell')
  .data(drum_map[0])
  .enter()
  .append('rect')
  .attr('class', 'cell')
  .attr('transform', function (d, i) {
    return "translate(" +
      ((i % 32) * 28) + "," +
      (Math.floor(i / 32 - 1) * 28) + ")"
      ;
  })
  .attr('width', '24px')
  .attr('height', '24px')
  .attr('rx', 5)
  .attr('ry', 5)
  .style('fill', fill);

update();

// ====================
// INTERACTION HANDLERS
// ====================

d3.selectAll('.cv').on('input', function () {
  key = +d3.select(this).attr("data-key");
  cv[key] = +this.value;
  d3.select("#value-" + key).text(this.value);
  update();
});

d3.select('#run').on('click', function () { run = !run; step = 0; tick(); });
d3.select('#bpm').on('input', function () { bpm = +this.value; d3.select('#value-bpm').text(this.value); });

// ============
// AUDIO PLAYER
// ============

const sound = new Howl({
  src: ['TR808.sprite.mp3', 'TR808.sprite.wav'],
  sprite: {
    BD: [0, 1500],
    BDA: [2000, 1500],
    SD: [4000, 500],
    SDA: [5000, 500],
    HH: [6000, 300],
    HHA: [7000, 500]
  }
});

// ===========
// UPDATE LOOP
// ===========

function tick() {
  d3.selectAll('.cell').style('fill', fill);
  if (!run) return;

  if (mixed[step + 0] > (255 ^ cv[0])) { sound.play(mixed[step + 0] > 192 ? "BDA" : "BD"); }
  if (mixed[step + 32] > (255 ^ cv[1])) { sound.play(mixed[step + 32] > 192 ? "SDA" : "SD"); }
  if (mixed[step + 64] > (255 ^ cv[2])) { sound.play(mixed[step + 64] > 192 ? "HHA" : "HH"); }
  step = (step + 1) % 32;

  if (run) setTimeout(tick, 60000 / 8 / bpm);
}