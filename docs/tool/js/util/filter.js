var filterUtil = {
	
	init: function(){
		setSubs([
            ['filterValues', filterUtil.publishFilteredData],
            ['nullsShown', filterUtil.nullsToggleHandler] // rather than subscribe publishFilteredData  to 
                                                          // both filter change and null toggle events, I'm
                                                          // making a null toggle event trigger a filter change -JO
		]);

        // dataRequest is an object {name:<String>, url: <String>[,callback:<Function>]]}
        controller.getData({
                    name: 'filterData',
                    url: model.URLS.filterData, 
                    callback: filterUtil.publishFilteredData
                }) 

	},

    filteredData: [],
    getNullsShown: function(){
        var state = getState();
        //Extract just the nullsShown stuff from our state
        //state is stored as nullsShown.data_id with period as part of the object's key. 

        var nullsShown = {};

        for (key in state) {
            splitKey = key.split(".");
            if (splitKey[0]=='nullsShown') {
                var currentState = state[key]
                nullsShown[splitKey[1]] = currentState;
            };
        };
        return nullsShown;
    },
    getFilterValues: function(){
        var state = getState();

        //Extract just the filterValues stuff from our state
        //state is stored as filterValues.data_id with period as part of the object's key. 
        //TODO this only works w/ one level of dot notation nesting (probably all we need).
        var filterValues = {};
        for (key in state) {
            splitKey = key.split(".");
            if (splitKey[0]=='filterValues') {
                var currentState = state[key]
                filterValues[splitKey[1]] = currentState
            };
        };
        return filterValues;
    },

	filterData: function(){
        
    	var workingData = model.dataCollection['filterData'].objects; 
        var nullsShown = filterUtil.getNullsShown(); // creates object with nullShown state ofall filters
        console.log('nullsShown',nullsShown);
        var filterValues = filterUtil.getFilterValues();
        console.log('filterValues',filterValues);

        for (var key in nullsShown){
            var component = (filterView.components.filter(function(obj){
                return obj.source == key;
            }))[0];

            if (component.component_type == 'continuous' || component.component_type == 'date'){
                workingData = workingData.filter(function(d){
                    return d[key] !== null || nullsShown[key][0]; // nullsShown[key][0] is true or fals; if false returns when d[key] is not null
                });
            }
        }

		for (key in filterValues) { // iterate through registered filters
			
            //need to get the matching component out of a list of objects
            var component = filterView.components.filter(function(obj) {
              return obj.source == key;
            });
            component = component[0] //the most recent filter (current and previous are returned in a list)
                        
			if (component['component_type'] == 'continuous') { //filter data for a 'continuous' filter
                
                if (filterValues[key][0].length == 0){
                    // don't filter because the filter has been removed.
                    // The length would be '1' because nullsShown is always included.
                } else {
                    //javascript rounding is weird
                    var decimalPlaces = component['data_type'] == 'integer' ? 0 : 2 //ternary operator
                    var min = Number(Math.round(filterValues[key][0][0]+'e'+decimalPlaces) +'e-'+decimalPlaces);
                    var max =Number(Math.round(filterValues[key][0][1]+'e'+decimalPlaces)+'e-'+decimalPlaces);

                    //filter it
                    workingData = workingData.filter(function(d){
                    // Refer to the third element of the most recent value of
                    // filterValues, which is a boolean indicating whether
                    // null values will be shown.
                        if(d[key] === null){
                            return nullsShown[key];
                        }
    					return (d[key] >= min && d[key] <= max);
    				});
                };
			}

			if (component['component_type']== 'date') {
                
                workingData = workingData.filter(function(d){
                   // Refer to the third element of the most recent value of
                   // filterValues, which is a boolean indicating whether
                   // null values will be shown.
                    if(d[key] === null){
                        return nullsShown[key];
                    }

                    // If the filter is 'empty' and the value isn't null,
                    // show the project.
                    if(filterValues[key][0].length === 0){
                        return true;
                    }
                    
                    return d[key].valueOf() >= filterValues[key][0][0].valueOf() 
                        && d[key].valueOf() <= filterValues[key][0][1].valueOf();
                });

			}

			if (component['component_type'] == 'categorical') {
				workingData = workingData.filter(function(d){
                    //If all objects are removed from filter list, assume they want all objects
                    if (filterValues[key][0].length == 0 ) {
                        return true;
                    }
                    //otherwise use the list of chosen categories
					return filterValues[key][0].includes(d[key]);
				})
			}
		}

        //Convert the workingData to a list of ids to be published
        var ids = []
        for (key in workingData) {
            ids.push(workingData[key]['nlihc_id']);
        };
        filterUtil.filteredData = ids;
	},
	
	deduplicate: function(){
		var result = [];
		for (var i = 0; i < this.filteredData.length; i++) {
			if(!result.includes(this.filteredData[i])){
				result.push(this.filteredData[i]);
			}
		}
		filterUtil.filteredData = result;
	},
	
	publishFilteredData: function(){ 
                                        
        filterUtil.filterData();
		filterUtil.deduplicate();
		setState('filteredData', filterUtil.filteredData);
	},
    nullsToggleHandler: function(msg){
        var dataChoice = dataChoices.find(function(each){
            return each.source === msg.split('.')[1];
        });
        filterView.filterInputs[dataChoice.short_name].callback(); // fire callback as if the associated filter has been changed
    }

};