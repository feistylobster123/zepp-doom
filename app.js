App.register({
  globalData: {
    playerX: 2.5,
    playerY: 2.5,
    playerAngle: 0,
    health: 100,
    ammo: 50,
    score: 0
  },

  onInit() {
    console.log('Zepp DOOM starting...');
  },

  onDestroy() {
    console.log('Zepp DOOM shutting down');
  }
});
