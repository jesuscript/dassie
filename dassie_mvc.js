/*       _               _      
 *    __| | __ _ ___ ___(_) ___ 
 *   / _` |/ _` / __/ __| |/ _ \
 *  | (_| | (_| \__ \__ \ |  __/
 *   \__,_|\__,_|___/___/_|\___|
 */


// why dassie? cuz they're soooo cute!!! ^_^
// http://www.youtube.com/watch?v=-svEVVyCM-0&feature=related

//TODO: delegate events 
//TODO: Model-template bindings
//TODO(maybe): before/after filters

dassie = {};
dassie.views = {};
dassie.models = {};
dassie.controllers = {};
dassie.collections = {};

(function($){
  var global = this;

  var eventEmitter = {
    initEventEmitter: function(){
      this._eH = {}; //events handler
    },
    bind: function(event, callback){
      if(this._eH[event] === undefined){
        this._eH[event] = [];
      }
      this._eH[event].push(callback);
    },
    trigger: function(event,data){
      if(this._eH[event] !== undefined){
        for(var i=0, l = this._eH[event].length; i < l; i++){
          this._eH[event][i](data);
        }
      }
    },
    unbindAll: function(){
      this._eH = {};
    }
  };

  var ajax_helpers = {
    //TODO: add error callbacks too?
    _get: function(url,data,callback){
      $.ajax({
        type: "GET",
        url: url,
        data: $.extend({format: "json", _method: "GET"}, data),
        success: callback
      });
    },
    _post: function(url,data,callback){
      $.ajax({
        type: "POST",
        url: url,
        data: $.extend({format: "json", _method: "POST"}, data),
        success: callback
      });
    },
    _put: function(url,data,callback){
      $.ajax({
        type: "POST",
        url: url,
        data: $.extend({format: "json", _method: "PUT"}, data),
        success: callback
      });
    },
    _delete: function(url,data,callback){
      $.ajax({
        type: "POST",
        url: url,
        data: $.extend({format: "json", _method: "DELETE"}, data),
        success: callback
      });
    }
  }
  // TODO: make data _completely_ private and add .get() and .set() methods
  dassie.Model = function(data){
    this.initEventEmitter();

    this.data = {};

    if(typeof data === "object"){
      this.setData(data);
    }

    if(this.construct !== undefined) this.construct.apply(this,arguments);
  }
  $.extend(
    dassie.Model.prototype,
    eventEmitter,
    {
      set: function(key, value){
        this.data[key] = value;
      },
      get: function(key){
        return this.data[key];
      },
      setData: function(data){
        if(typeof data !== "object"){
          throw new Error("setData(): " + data + " is not an object!");
        }
        $.extend(this.data, data);
        
        this.trigger("update",data);
      },
      replaceData: function(data){
        this.data = {};
        this.setData(data);
      },
      destroy: function(){
        this.trigger("destroy");
        for(prop in this)  if(this.hasOwnProperty(prop))  delete this[prop];
        delete this;
      },

      /* Sends a request to update the server-side representation of the model 
       * and load model's properties to update the object's data
       * Default Rails action: #update
       */
      // asynchronous synchronisation lol
      save: function(){ 
        var self = this;
        var args = getAjaxArguments.call(this,arguments);

        ajax_helpers._put(this.savePath !== undefined ? this.savePath() : this.path(),
                          args.data,
                          function(response){
                            if(typeof args.callback === "function") args.callback(response);
                          });
      },
      /* Sends a request to receive new data and update the object's properties.
       * Default Rails action: #show
       */
      load: function(){ 
        var self = this;
        var args = getAjaxArguments.call(this,arguments);
        
        ajax_helpers._get(this.loadPath !== undefined ? this.loadPath() : this.path(), 
                          args.data, 
                          function(response){
                            self.setData(response);
                            if(typeof args.callback === "function") args.callback(response);
                          });
      },
      /* lower-level synchronisation function. it's preferable to use sync and load instead 
       * of this one*/
      request: function(path,data,callback, set_data){
      },

      /* Sends a request to create a new server-side representation of the model 
       * Rails action: #create
       */
      saveNew: function(data,callback){
        //TODO
      },
      /* Sends a request to delete the server-side representation of the model 
       * Rails action: #delete
       */
      "delete": function(data,callback){
        //TODO
      }
    }
  );
  //static methods:
  $.extend(dassie.Model, ajax_helpers);

  dassie.Collection = function(){
    if(typeof this.models !== "object"){
      throw new Error("Collection(): " + this.models + " is not an object!");
    }

    this.initEventEmitter();

    for(model in this.models){
      if(this.models.hasOwnProperty(model)){
        this[model] = $.extend({}, eventEmitter, modelFunctions);
        this[model].initEventEmitter();

        this[model].type = this.models[model]; // TODO: private
        this[model].objects = {}; //TODO: private
      }
    }
    delete this.models;

    if(this.construct !== undefined) this.construct.apply(this,arguments);
  }

  var modelFunctions = {
    add: function(obj){
      if(obj.get("id") === undefined) {
        throw new Error("Object passed as an argument must have an id property");
      }

      if(obj instanceof this.type){
        this.objects[obj.get("id")] = obj;
      }else{
        this.objects[obj.get("id")] = new this.type(obj);
      }
      this.trigger("added", this.objects[obj.get("id")]);
    },
    remove: function(obj){
      if(obj.get("id") === undefined) {
        throw new Error("Object passed as an argument must have an id property");
      }

      delete this.objects[obj.get("id")];
      
      this.trigger("removed", obj);
    },
    asArray: function(){
      var result = [];

      for(p in this.objects){
        if(this.objects.hasOwnProperty(p)){
          result.push(this.objects[p]);
        }
      }
      return result;
    },
    is_model: true
  }

  // TODO: make models and data _completely_ private
  $.extend(
    dassie.Collection.prototype,
    eventEmitter,
    {
      /* Sends a request to get the model objects, updates the currently existing ones,
         creates new ones and cleans up the no longer existing models*/
      pull: function(){ 
        var args = getAjaxArguments.call(this,arguments)

        if(typeof this.path !== "function"){
          throw new Error("pull(): "+ typeof this.path +" is not a function!");
        }
        var self = this;
        
        ajax_helpers._get(this.path(), args.data, function(response){
          for(prop in response){
            if(response.hasOwnProperty(prop) && self[prop] !== undefined &&
               self[prop].is_model){

              parseJSONObjectsAsModelObjects.call(self,response[prop], self[prop]);
            }
          }

          self.trigger("pulled");
          if(typeof args.callback === "function") args.callback();
        });
      }
    }
  );

  function parseJSONObjectsAsModelObjects(JSON, model_ref){
    var parsed_ids = {};
    
    for(prop in JSON){
      if(JSON.hasOwnProperty(prop)){
        var obj_id = JSON[prop].id;
        if(obj_id === undefined){
          throw new Error("parseJSONObjectsAsModelObjects(): each object in the response " +
                          "must have an id property");
        }
        parsed_ids[obj_id] = true; // save the ID for later

        if(model_ref.objects[obj_id] !== undefined){ // object exists, update it
          model_ref.objects[obj_id].setData(JSON[prop]);
        }else{ // object doesn't exist, create it and add to the hash
          model_ref.add(new model_ref.type(JSON[prop]));
        }
      }
    }
    // finally, remove all objects of this model that were not in JSON:
    for(prop in model_ref.objects){
      if(model_ref.objects.hasOwnProperty(prop) && 
         !parsed_ids.hasOwnProperty(model_ref.objects[prop].get("id"))){
        
        model_ref.remove(model_ref.objects[prop]);
      }
    }
  }

  function getAjaxArguments(args){
    if(args.length > 3){
      throw new Error("getAjaxArguments(): can't take more than 3 arguments");
    }

    var url, data, callback;

    for(var i=0, l=args.length; i<l;i++){
      if(typeof args[i] === "string" && url === undefined) url = args[i];
      else if(typeof args[i] === "object" && data === undefined) data = args[i];
      else if(typeof args[i] === "function" && callback === undefined) callback = args[i];
      else{
        throw new Error("getAjaxArguments(): something wrong with the arguments. Sorry...");
      }
    }

    return {url: url, data: data, callback: callback};
  }

  dassie.Controller = function(){
    if(this.construct !== undefined) this.construct.apply(this,arguments);
  }

  dassie.View = function(opts){
    if(opts === undefined) opts = {};
    $.extend(this, opts);
    this.initEventEmitter();
    if(this.construct !== undefined) this.construct.apply(this,arguments);
    //TODO (maybe, when dassie is cool enough :): this.delegateEvents();
  }

  $.extend(
    dassie.View.prototype,
    eventEmitter, {
      destroy: function(){
        this.trigger("destroy");

        this.$el.remove();
        
        for(prop in this)  if(this.hasOwnProperty(prop))  delete this[prop];
        delete this;
      }
    }
  );

  //helper functions

  var extend =  function(props,static_props){
    var parent = this;
    var child;

    child = function(){
      parent.apply(this,arguments);
    };

    $.extend(child,parent,static_props)

    // using surrogate object to set child's prototype chain to inherit from parent
    var F = function(){ this.constructor = child; };
    F.prototype = parent.prototype;
    child.prototype = new F;
    $.extend(child.prototype,props)

    // child.__super__ = parent.prototype; // used in backbone, but I think this is better:
    child.prototype.__super__ = parent.prototype;
    
    return child;
  }

  dassie.Model.extend = dassie.Controller.extend = dassie.View.extend = extend;
  dassie.Collection.extend = extend;
})(jQuery);
