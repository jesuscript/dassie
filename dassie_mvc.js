/*       _               _      
 *    __| | __ _ ___ ___(_) ___ 
 *   / _` |/ _` / __/ __| |/ _ \
 *  | (_| | (_| \__ \__ \ |  __/
 *   \__,_|\__,_|___/___/_|\___|
 */

// why dassie? cuz they're cute! (͡° ͜ʖ͡°)
// http://www.youtube.com/watch?v=-svEVVyCM-0&feature=related


// TODO: Custom event delegation on views
// TODO: Two-way data bindings similar to Ember/Knockout





// here be dragons...




dassie = {};
dassie.views = {};
dassie.models = {};
dassie.controllers = {};
dassie.collections = {};
dassie.extensions = {};

(function($){
  var global = this;

  var eventEmitter = {
    initEventEmitter: function(){
      this._e_h = {}; //events handler
    },
    bind: function(event, callback){
      if(this._e_h[event] === undefined){
        this._e_h[event] = [];
      }
      this._e_h[event].push(callback);
    },
    trigger: function(event,data){
      if(this._e_h[event] !== undefined){
        for(var i=0, l = this._e_h[event].length; i < l; i++){
          this._e_h[event][i](data);
        }
      }
    },
    unbindAll: function(){
      this._e_h = {};
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

        for(prop in this){ // include prototype properties
          delete this[prop];
        }
        delete this;
      },

      /* Sends a request to update the server-side representation of the model 
       * and load model's properties to update the object's data
       * Rails action: #update
       */
      save: function(){
        if(typeof this.save_name !== "string"){
          throw new Error("save(): save_name needs to be a string. Got: " +
                          typeof this.save_name + ". What else did you expect? ");
        }
        
        var self = this;
        var args = getAjaxArguments.call(this,arguments); // yes, it's a call, not apply
        var data = {};
        data[this.save_name] = this.data;
        if(typeof args.data === "object") $.merge(data, args.data);

        ajax_helpers._put(this.savePath !== undefined ? this.savePath() : this.path(),
                          data,
                          function(response){
                            if(typeof args.callback === "function") args.callback(response);
                          });
      },
      /* Sends a request to receive new data and update the object's properties.
       * Rails action: #show
       */
      load: function(){ 
        var self = this;
        var args = getAjaxArguments.call(this,arguments); // yes, it's a call, not apply
        
        ajax_helpers._get(this.loadPath !== undefined ? this.loadPath() : this.path(), 
                          args.data, 
                          function(response){
                            self.setData(response);
                            if(typeof args.callback === "function") args.callback(response);
                          });
      },
      /* Sends a request to create a new server-side representation of the model 
       * Rails action: #create
       */
      saveNew: function(){
        if(typeof this.save_name !== "string"){
          throw new Error("save(): save_name needs to be a string. Got: " +
                          typeof this.save_name + ". What else did you expect? ");
        }

        var self = this;

        var args = getAjaxArguments.call(this,arguments); // yes, it's a call, not apply
        var data = {};
        data[this.save_name] = this.data;
        if(typeof args.data === "object") $.merge(data, args.data);

        ajax_helpers._post(this.saveNewPath(), data, function(response){

          if(typeof args.callback === "function") args.callback(response);
        });
      },
      /* Sends a request to delete the server-side representation of the model 
       * Rails action: #delete
       */
      "delete": function(){
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

        this[model].type = this.models[model]; 
        this[model].objects = {}; 
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
        if(obj_id !== undefined && obj_id !== null){
          parsed_ids[obj_id] = true; // save the ID for later

          if(model_ref.objects[obj_id] !== undefined){ // object exists, update it
            model_ref.objects[obj_id].setData(JSON[prop]);
          }else{ // object doesn't exist, create it and add to the hash
            model_ref.add(new model_ref.type(JSON[prop]));
          }
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

        for(prop in this){    // include prototype properties
          delete this[prop];
        }    
        delete this;
      }
    }
  );

  
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

    child.__super__ = parent.prototype;
    child.prototype.__super__ = parent.prototype; //unfortunately there's a problem with this

    return child;
  }

  dassie.Model.extend = dassie.Controller.extend = dassie.View.extend = extend;
  dassie.Collection.extend = extend;
})(jQuery);
