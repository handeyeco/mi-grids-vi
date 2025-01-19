// ===============
// MAIN GRIDS CODE
// ===============

// settings state
let mixed;
let xpage;
let xbalance;
let ypage;
let ybalance;

// sequencer state
let step = 0;
let run = false;
let bpm = 120;

// D3 globals
let svg;
let color;

/**
 * Collection of state
 * - 0: Fill 1
 * - 1: Fill 2
 * - 2: Fill 3
 * - 3: X
 * - 4: Y
 */
let cv = [50, 50, 50, 0, 0];

function U8Mix(a, b, x) {
  return (x * b + (0xff - x) * a) >> 8;
}

function calculateMixed() {
  xpage = cv[3] >> 6;
  xbalance = (cv[3] << 2) & 0xff;
  ypage = cv[4] >> 6;
  ybalance = (cv[4] << 2) & 0xff;

  mixed = [];
  for (i = 0; i < 96; i++) {
    const a = drum_map[(xpage + 0) * 5 + ypage + 0][i];
    const b = drum_map[(xpage + 1) * 5 + ypage + 0][i];
    const c = drum_map[(xpage + 0) * 5 + ypage + 1][i];
    const d = drum_map[(xpage + 1) * 5 + ypage + 1][i];
    mixed[i] = U8Mix(U8Mix(a, b, xbalance), U8Mix(c, d, xbalance), ybalance);
  }
}

// ==================
// URL PARAM HANDLING
// ==================

// get settings from URL
const searchParams = new URLSearchParams(location.search);
if ((incv = searchParams.get("cv"))) {
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

svg = d3.select("svg");
color = d3.scaleLinear().domain([0, 0xff]).range(["white", "blue"]);

function fill(d, i) {
  return run && step == i % 32 && d > (0xff ^ cv[Math.floor(i / 32)])
    ? "orange"
    : color(d);
}

function update() {
  d3.select("#coordinates").text(
    xpage + ":" + xbalance + "," + ypage + ":" + ybalance
  );

  svg.selectAll(".cell").data(mixed);
  svg
    .selectAll(".cell")
    .style("stroke", function (d, i) {
      // javascripts ~ op gives the 1's compliment for some reason
      // so we xor the cv value with 0xFF for both inversions instead
      return d > (0xff ^ cv[Math.floor(i / 32)]) ? "black" : "lightgray";
    })
    .style("stroke-width", function (d, i) {
      return d > 192 && d > (0xff ^ cv[Math.floor(i / 32)]) ? 3 : 1;
    })
    .style("fill", color);

  const url = new URL(location.href);
  const permalink = url.origin + url.pathname + "?cv=" + cv.join(",");
  d3.select("#permalink").attr("href", permalink);
}

function updateTable() {
  d3.select("#x-binary").text(cv[3].toString(2).padStart(8, '0'));
  d3.select("#x-decimal").text(cv[3]);

  d3.select("#y-binary").text(cv[4].toString(2).padStart(8, '0'));
  d3.select("#y-decimal").text(cv[4]);

  d3.select("#xpage-binary").text(xpage.toString(2).padStart(8, '0'));
  d3.select("#xpage-decimal").text(xpage);

  d3.select("#xbalance-binary").text(xbalance.toString(2).padStart(8, '0'));
  d3.select("#xbalance-decimal").text(xbalance);

  d3.select("#ypage-binary").text(ypage.toString(2).padStart(8, '0'));
  d3.select("#ypage-decimal").text(ypage);

  d3.select("#ybalance-binary").text(ybalance.toString(2).padStart(8, '0'));
  d3.select("#ybalance-decimal").text(ybalance);
}

svg
  .append("g")
  .attr("transform", "translate(10,30)")
  .selectAll(".cell")
  .data(drum_map[0])
  .enter()
  .append("rect")
  .attr("class", "cell")
  .attr("transform", function (d, i) {
    return (
      "translate(" + (i % 32) * 28 + "," + Math.floor(i / 32 - 1) * 28 + ")"
    );
  })
  .attr("width", "24px")
  .attr("height", "24px")
  .attr("rx", 5)
  .attr("ry", 5)
  .style("fill", fill);

// ====================
// INTERACTION HANDLERS
// ====================

d3.selectAll(".cv").on("input", function () {
  key = +d3.select(this).attr("data-key");
  cv[key] = +this.value;
  d3.select("#value-" + key).text(this.value);
  calculateMixed();
  update();
  updateTable();
});

d3.select("#run").on("click", function () {
  run = !run;
  d3.select(this).text(run ? "Stop" : "Run")
  step = 0;
  tick();
});

d3.select("#bpm").on("input", function () {
  bpm = +this.value;
  d3.select("#value-bpm").text(this.value);
});

// ============
// AUDIO PLAYER
// ============

const sound = new Howl({
  src: ["TR808.sprite.mp3", "TR808.sprite.wav"],
  sprite: {
    BD: [0, 1500],
    BDA: [2000, 1500],
    SD: [4000, 500],
    SDA: [5000, 500],
    HH: [6000, 300],
    HHA: [7000, 500],
  },
});

// ==========
// INITIALIZE
// ==========

function init() {
  calculateMixed()
  update();
  updateTable();

  // make sure sliders match inital state
  // when loading
  d3.selectAll(".cv").each(function () {
    const input = d3.select(this);
    const key = +input.attr("data-key");
    console.log({input, key, value: cv[key]})
    input.property("value", cv[key]);
  });
}

init();

// ===========
// UPDATE LOOP
// ===========

function tick() {
  d3.selectAll(".cell").style("fill", fill);
  if (!run) return;

  if (mixed[step + 0] > (255 ^ cv[0])) {
    sound.play(mixed[step + 0] > 192 ? "BDA" : "BD");
  }
  if (mixed[step + 32] > (255 ^ cv[1])) {
    sound.play(mixed[step + 32] > 192 ? "SDA" : "SD");
  }
  if (mixed[step + 64] > (255 ^ cv[2])) {
    sound.play(mixed[step + 64] > 192 ? "HHA" : "HH");
  }
  step = (step + 1) % 32;

  if (run) setTimeout(tick, 60000 / 8 / bpm);
}