(function () {
  "use strict";

  const easy = [
    "ace", "ant", "arc", "arm", "ash", "bat", "bay", "bee", "bit", "blue",
    "book", "box", "boy", "bus", "car", "cat", "cold", "cow", "day", "dog",
    "dot", "dry", "ear", "east", "egg", "eye", "fan", "far", "fire", "fish",
    "fog", "fox", "fun", "game", "gas", "gem", "glow", "goal", "gold", "good",
    "gray", "hat", "heat", "hero", "hill", "ice", "jet", "job", "joy", "jump",
    "key", "lake", "lamp", "land", "leaf", "leg", "lion", "map", "mars", "moon",
    "net", "nova", "orb", "owl", "path", "play", "pod", "rain", "red", "ring",
    "rock", "run", "safe", "ship", "sky", "snow", "sonic", "star", "sun", "team",
    "tree", "twin", "unit", "void", "wall", "wave", "wind", "wing", "wolf", "zone",
    "beam", "bird", "bolt", "boot", "code", "core", "dash", "dawn", "fuel", "hope"
  ];

  const normal = [
    "alien", "anchor", "armor", "asteroid", "attack", "beacon", "binary", "blaster", "boost", "battle",
    "cargo", "celestial", "circuit", "cluster", "comet", "command", "cosmic", "crater", "danger", "defense",
    "drifter", "eclipse", "energy", "engine", "escape", "falcon", "fighter", "flight", "fusion", "galaxy",
    "gravity", "helmet", "horizon", "impact", "launch", "laser", "lunar", "matrix", "meteor", "mission",
    "nebula", "orbit", "oxygen", "photon", "pilot", "planet", "plasma", "portal", "pulsar", "radar",
    "reactor", "rescue", "rocket", "satellite", "sector", "shield", "shuttle", "signal", "solar", "space",
    "station", "system", "target", "thruster", "typing", "vector", "voyager", "weapon", "zenith", "airlock",
    "capsule", "carrier", "control", "crystal", "destroy", "explore", "frequency", "hangar", "landing", "machine",
    "magnetic", "mercury", "module", "navigator", "neutron", "quantum", "scanner", "starlight", "tactical", "telemetry",
    "terminal", "trajectory", "universe", "velocity", "vessel", "warrior", "wormhole", "zero", "radiant", "outpost"
  ];

  const hard = [
    "acceleration", "aeronautical", "algorithmic", "astronomical", "astrophysics", "authentication", "architecture", "bioluminescent", "celestially", "chronological",
    "communication", "configuration", "constellation", "cybersecurity", "decompression", "electromagnetic", "extraterrestrial", "gravitational", "hyperspace", "infrastructure",
    "intergalactic", "interstellar", "meteorological", "microgravity", "navigation", "observatory", "orbitalmechanics", "photosynthesis", "programming", "quantization",
    "reconnaissance", "synchronization", "technological", "telecommunication", "terraforming", "virtualization", "weightlessness", "aerodynamics", "bioengineering", "circumnavigation",
    "computational", "cryogenics", "disintegration", "electrostatic", "environmental", "geostationary", "gyroscopic", "harmonization", "interplanetary", "magnetosphere",
    "nanotechnology", "neutronstar", "propulsion", "radiological", "spectrometer", "superluminal", "thermodynamic", "transmission", "ultraviolet", "unidentified",
    "atmospheric", "calibration", "civilization", "cosmological", "crystallization", "dimensional", "exoplanetary", "fragmentation", "heliocentric", "hydroponics",
    "instrumentation", "luminescence", "maneuverability", "navigational", "photovoltaic", "planetarium", "quasiperiodic", "radioactive", "recalibration", "revolutionary",
    "semiconductor", "spectroscopy", "stabilization", "subterranean", "superconductive", "telepathically", "transgalactic", "triangulation", "uninhabitable", "xenobiology",
    "astrobiology", "countermeasure", "electrodynamic", "interdimensional", "micrometeorite", "multidirectional", "nucleosynthesis", "paraterrestrial", "quantitative", "radiotelemetry"
  ];

  window.WORD_LISTS = Object.freeze({ easy, normal, hard });
}());
