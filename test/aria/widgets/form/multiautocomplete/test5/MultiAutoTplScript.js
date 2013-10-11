/**
 * Script for the autocomplete sample
 * @class samples.widgets.form.templates.AutoCompleteSampleScript
 */
Aria.tplScriptDefinition({
    $classpath : 'test.aria.widgets.form.autocomplete.multiautocomplete.test5.MultiAutoTplScript',
    $dependencies : ['aria.resources.handlers.MultiAutocompleteResourcesHandler'],
    $constructor : function () {
        this.dateUtils = aria.utils.Date;
        this.airlinesHandler = this.newAirLinesHandler();
    },
    $prototype : {
        newAirLinesHandler : function (cfg) {
            var handler = new aria.resources.handlers.MultiAutocompleteResourcesHandler(cfg);
            handler.setSuggestions([{
                        label : 'Air France',
                        code : 'AF'

                    }, {
                        label : 'Air Canada',
                        code : 'AC'
                    }, {
                        label : 'Finnair',
                        code : 'XX'
                    }, {
                        label : 'Qantas',
                        code : '--'
                    }, {
                        label : 'American Airlines',
                        code : 'AA'
                    }, {
                        label : 'Emirates',
                        code : 'EK'
                    }, {
                        label : 'P1.some',
                        code : 'AF'
                    }, {
                        label : 'P2.kon',
                        code : 'AC'
                    }, {
                        label : 'P3.red',
                        code : 'XX'
                    }, {
                        label : 'P4.redd',
                        code : '--'
                    }, {
                        label : 'Scandinavian Airlines System',
                        code : 'SK'
                    }]);
            handler.codeExactMatch = true;
            return handler;
        },

        getAirLinesHandler : function () {
            return this.airlinesHandler;
        },

        toggleAutoSelect : function () {
            this.airlinesHandler.codeExactMatch = !this.airlinesHandler.codeExactMatch;
        }
    }
});