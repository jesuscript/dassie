(function(){
  // abstract class that enhances dassie.Model with data validation
  dassie.models.ValidatableModel = dassie.Model.extend({
    validate: function() {
      this.errors = {};
      
      if(this.validate_not_empty !== undefined) this.validateNotEmpty();

      return this;
    },
    isValid: function(){
      return $.isEmptyObject(this.errors);
    },
    validateNotEmpty:function(){
      var property;
      
      for(var i=0, l=this.validate_not_empty.length; i<l;i++){
        property = this.validate_not_empty[i];

        if(this.get(property) === undefined || this.get(property) === null ||
           !this.get(property).length){
          this._addError(property, "Cannot be empty");
        }
      }
    },
    save: function(){ //overrides Model's save
      this.validate();

      if(this.errors.length){
        this._throwValidationError();
      }else{
        dassie.models.ValidatableModel.__super__.save.apply(this,arguments);
      }
    },
    saveNew: function(){ // overrides Model's saveNew
      this.validate();

      if(this.errors.length){
        this._throwValidationError();
      }else{
        dassie.models.ValidatableModel.__super__.saveNew.apply(this,arguments);
      }
    },
    _throwValidationError: function(){
      var errors_str = "";
      
      for(var prop in this.errors){

        if(this.errors.hasOwnProperty(err)){
          errors_str += prop + ": ";

          for(var i=0, l=this.errors[prop].length; i<l; i++){
            error_str += this.errors[prop][i];

            if(i != l-1) error_str += ", ";
          }

          errors_str += "; ";
        }
      }
      
      throw new Error("save(): trying to save a model that fails validations: " + error_str);
    },
    _addError: function(property, error){

      if(! (this.errors[property] instanceof Array))  this.errors[property] = [];

      this.errors[property].push(error);
    }
    
  });
})();

