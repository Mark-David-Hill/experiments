document.addEventListener("click", () => console.log("clicked"));

planck.testbed(function (testbed) {
  var world = planck.World({
    gravity: new Vec2(0.0, -10.0),
  });

  return world; // make sure you return the world
});
