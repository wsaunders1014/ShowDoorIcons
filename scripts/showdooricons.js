
/***************************************************************************************************************/
/*


FORCE DOOR ICON VISIBILITY ON WALL LAYER


*/
/***************************************************************************************************************/
ControlsLayer.prototype.drawDoors = function() {
    // Create the container
    if ( this.doors ) {
      this.doors.destroy({children: true});
      this.doors = null;
    }
    const doors = new PIXI.Container();

    // Iterate over all walls, selecting the doors
    for ( let w of canvas.walls.placeables ) {
      if ( w.data.door === CONST.WALL_DOOR_TYPES.NONE ) continue;
      if ( (w.data.door === CONST.WALL_DOOR_TYPES.SECRET) && !game.user.isGM ) continue;
      let dc = doors.addChild(new DoorControl(w));
       if(game.settings.get('showdooricons','enabled')===true){
      		dc.visible = true; 
       }else {
     		dc.visible = false; // Start door controls as initially not visible and reveal them later
       }
     	
      dc.draw();
    }
    this.doors = this.addChild(doors);

    // Toggle visibility for the set of door control icons
     if(game.settings.get('showdooricons','enabled')!==true){
    	this.doors.visible = !canvas.walls._active;
    }

  }

  Wall.prototype._onModifyWall = async function(state=false) {
    canvas.addPendingOperation("ControlsLayer.drawDoors", canvas.controls.drawDoors, canvas.controls);
    if ( state ) {
      await canvas.sight.initialize(); // This needs to happen first to rebuild FOV/LOS polygons
      canvas.lighting.initialize();
      canvas.sounds.initialize();
    }
    canvas.triggerPendingOperations();
  }
//Overwrite Activate call to prevent doors from going invisible.
WallsLayer.prototype.activate = function(){

  PlaceablesLayer.prototype.activate.call(this)
  //Force Show Doors is set to True
  if(game.settings.get('showdooricons','enabled')===false){
  	if (canvas.controls) canvas.controls.doors.visible = false;

  }
   
}
/***************************************************************************************************************/

Hooks.once('init',()=>{

  game.settings.register('showdooricons', 'enabled', {
      name: "sdi.force-doors-s",
      hint: "sdi.force-doors-l",
      scope: "world",
      config: true,
      default: true,
      type: Boolean,
      onChange: x => window.location.reload()
    });
})