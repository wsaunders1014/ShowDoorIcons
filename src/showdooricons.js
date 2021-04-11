/**
 * This is your TypeScript entry file for Foundry VTT.
 * Register custom settings, sheets, and constants using the Foundry API.
 * Change this heading to be more descriptive to your module, or remove it.
 * Author: [your name]
 * Content License: [copyright and-or license] If using an existing system
 * 					you may want to put a (link to a) license or copyright
 * 					notice here (e.g. the OGL).
 * Software License: [your license] Put your desired license here, which
 * 					 determines how others may use and modify your module
 */
// Import JavaScript modules
// import {libWrapper} from './module/libs/shim.js';
// Import TypeScript modules

export const MODULE_NAME = "showdooricons";

/**
 * Because typescript doesn’t know when in the lifecycle of foundry your code runs, we have to assume that the
 * canvas is potentially not yet initialized, so it’s typed as declare let canvas: Canvas | {ready: false}.
 * That’s why you get errors when you try to access properties on canvas other than ready.
 * In order to get around that, you need to type guard canvas.
 * Also be aware that this will become even more important in 0.8.x because a „no canvas“ mode is being introduced there.
 * So you will need to deal with the fact that there might not be an initialized canvas at any point in time.
 * @returns
 */
 export function getCanvas() {
	if (!canvas || !canvas.ready) {
		throw new Error("Canvas Is Not Initialized");
	}
	return canvas;
}

export let debugEnabled = 0;
// 0 = none, warnings = 1, debug = 2, all = 3
export let debug = (...args) => {if (debugEnabled > 1) console.log(`DEBUG:${MODULE_NAME} | `, ...args)};
export let log = (...args) => console.log(`${MODULE_NAME} | `, ...args);
export let warn = (...args) => {if (debugEnabled > 0) console.warn(`${MODULE_NAME} | `, ...args)};
export let error = (...args) => console.error(`${MODULE_NAME} | `, ...args);
export let timelog = (...args) => warn(`${MODULE_NAME} | `, Date.now(), ...args);

export let i18n = key => {
  return game.i18n.localize(key);
};
export let i18nFormat = (key, data = {}) => {
  return game.i18n.format(key, data);
}

export let setDebugLevel = (debugText) => {
  debugEnabled = {"none": 0, "warn": 1, "debug": 2, "all": 3}[debugText] || 0;
  // 0 = none, warnings = 1, debug = 2, all = 3
  if (debugEnabled >= 3) CONFIG.debug.hooks = true;
}

/* ------------------------------------ */
/* Initialize module					*/
/* ------------------------------------ */
Hooks.once('init', async () => {
	console.log(`${MODULE_NAME} | Initializing ${MODULE_NAME}`);

  // Register custom module settings
  game.settings.register(MODULE_NAME, 'enabled', {
    name: "sdi.force-doors-s",
    hint: "sdi.force-doors-l",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
    onChange: x => window.location.reload()
  });

	// Assign custom classes and constants here
			
	// Preload Handlebars templates

	// Register custom sheets (if any)

});

/* ------------------------------------ */
/* Setup module							*/
/* ------------------------------------ */
Hooks.once('setup', function () {
	// Do anything after initialization but before ready

	// Register custom module settings
});

/* ------------------------------------ */
/* When ready							*/
/* ------------------------------------ */
Hooks.once('ready', () => {
	// Do anything once the module is ready
	if (!game.modules.get("lib-wrapper")?.active && game.user.isGM){
    ui.notifications.error(`The '${MODULE_NAME}' module requires to install and activate the 'libWrapper' module.`);
    return;
  }

  libWrapper.register(MODULE_NAME, 'ControlsLayer.prototype.drawDoors', ControlsLayerPrototypeDrawDoorsHandler, 'WRAPPER');
  libWrapper.register(MODULE_NAME, 'Wall.prototype._onModifyWall', WallPrototypeOnModifyWallHandler, 'WRAPPER');
  libWrapper.register(MODULE_NAME, 'WallsLayer.prototype.activate', WallsLayerPrototypeActivate, 'WRAPPER');

});

// Add any additional hooks if necessary

export const ControlsLayerPrototypeDrawDoorsHandler = async function (wrapped, ...args) {
  // Create the container
  if ( this.doors ) {
    this.doors.destroy({children: true});
    this.doors = null;
  }
  const doors = new PIXI.Container();

  // Iterate over all walls, selecting the doors
  for ( let w of getCanvas().walls.placeables ) {
    if ( w.data.door === CONST.WALL_DOOR_TYPES.NONE ) {
      continue;
    }
    if ( (w.data.door === CONST.WALL_DOOR_TYPES.SECRET) && !game.user.isGM ){
      continue;
    }
    let dc = doors.addChild(new DoorControl(w));
    if(game.settings.get(MODULE_NAME,'enabled')===true){
      dc.visible = true; 
    }else {
      dc.visible = false; // Start door controls as initially not visible and reveal them later
    }
    
    if(dc.transform.scale){
      await dc.draw();
    }
  }
  this.doors = this.addChild(doors);

  // Toggle visibility for the set of door control icons
  if(game.settings.get(MODULE_NAME,'enabled')!==true){
    this.doors.visible = !getCanvas().walls._active;
  }
  return wrapped(...args);
};

export const WallPrototypeOnModifyWallHandler = async function (wrapped, ...args) {
  if(getCanvas()){
    const state = args[0];
    getCanvas().addPendingOperation("ControlsLayer.drawDoors", getCanvas().controls.drawDoors, getCanvas().controls);
    if ( state ) {
      // TODO CHECK IF IS STILL NEEDED 'Unexpected reserved word'
      //if(canvas.sight.children){
      //  await getCanvas().sight.initialize(); // This needs to happen first to rebuild FOV/LOS polygons
      //}
      //getCanvas().lighting.initialize();
      await getCanvas().lighting.releaseAll()
      getCanvas().sounds.initialize();
    }
    getCanvas().triggerPendingOperations();
  }
  // ???????????????
  if(!getCanvas().controls.doors){
    getCanvas().controls.doors = {};
  }
  if(!getCanvas().controls.doors.children){
    getCanvas().controls.doors.children = [];
  }
  return wrapped(...args);
}

//Overwrite Activate call to prevent doors from going invisible.
export const WallsLayerPrototypeActivate = function (wrapped, ...args) {
  //PlaceablesLayer.prototype.activate.call(this)
  //Force Show Doors is set to True
  if(game.settings.get(MODULE_NAME,'enabled')===false){
    if (getCanvas().controls){
      getCanvas().controls.doors.visible = false;
    }
  }
  return wrapped(...args);
}