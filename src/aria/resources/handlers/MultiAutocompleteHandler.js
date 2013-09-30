/*
 * Copyright 2012 Amadeus s.a.s.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
(function () {

    // shortcuts
    var jsonValidator, stringUtil, typesUtil;

    /**
     * Resources handler for LABEL-CODE suggestions. This handler is to be fed and used with user defined entries.<br />
     * Suggestion must match the bean defined in this.SUGGESTION_BEAN
     */
    Aria.classDefinition({
        $classpath : "aria.resources.handlers.MultiAutocompleteHandler",
        $extends : "aria.resources.handlers.LCResourcesHandler",
        $implements : ["aria.resources.handlers.IMultiAutocompleteHandler"],
        $dependencies : ["aria.utils.String", "aria.resources.handlers.MultiAutocompleteHandlerBean"],
        $statics : {
            /**
             * Suggestion bean that validates a given suggestion
             * @type String
             */
            SUGGESTION_BEAN : "aria.resources.handlers.MultiAutocompleteHandlerBean.Suggestion",
            CONFIGURATION_BEAN : "aria.resources.handlers.MultiAutocompleteHandlerBean.Configuration",
            INVALID_CONFIG : "Invalid handler configuration in : %1.",
            INVALD_SUGGESTION_TYPE : "Suggestions must be an array.",
            INVALID_SUGGESTIONS : "Suggestions does not match suggestion bean aria.resources.handlers.MultiAutocompleteHandlerBean.Suggestions",
            INVALID_KEYCODE : "Suggestions does not match labelKey or codeKey"
        },
        /**
         * @param {aria.resources.handlers.LCResourcesHandlerBean:Configuration} cfg
         */
        $constructor : function (cfg) {

        },
        $destructor : function () {
            this._suggestions = null;
        },
        $onload : function () {
            jsonValidator = aria.core.JsonValidator;
            stringUtil = aria.utils.String;
            typesUtil = aria.utils.Type;
        },
        $onunload : function () {
            jsonValidator = null;
            stringUtil = null;
            typesUtil = null;
        },
        $prototype : {

            /**
             * Call the callback with an array of suggestions in its arguments. Suggestions that are exact match are
             * marked with parameter exactMatch set to true and filters the suggestions which are already exists in value array.
             * @param {json:Object} entryObject having the text entry, value array and callback
             */
            getSuggestions : function (entryObject) {

            },

            /**
             * Returns the classpath of the default template for this resourceHandler
             * @return {String}
             */
            getDefaultTemplate : function () {
                return 'aria.widgets.form.list.templates.LCTemplate';
            },

            /**
             * Set the list of available suggestion
             * @param {Array} suggestions list of suggestion objects
             */
            setSuggestions : function (suggestions) {

                if (typesUtil.isArray(suggestions)) {
                    var newSuggestions = [], suggestionsLabel = this._options.labelKey, suggestionsCode = this._options.codeKey;
                    if (this._options.sortingMethod && typesUtil.isFunction(this._options.sortingMethod)) {
                        suggestions.sort(this._options.sortingMethod);
                    } else {
                        suggestions.sort(function (a, b) {
                            return (a[suggestionsLabel] < b[suggestionsLabel])
                                    ? 1
                                    : (a[suggestionsLabel] > b[suggestionsLabel]) ? -1 : 0;
                        });
                    }

                    for (var index = 0, l = suggestions.length; index < l; index++) {
                        var suggestion = suggestions[index], eachSuggestion = {};
                        if (this.__islabelCode && !jsonValidator.check(suggestion, this.SUGGESTION_BEAN)) {
                            return this.$logError(this.INVALID_SUGGESTIONS, null, suggestions);

                        } else if (!(suggestion.hasOwnProperty(suggestionsLabel) && suggestion.hasOwnProperty(suggestionsCode))) {
                            return this.$logError(this.INVALID_KEYCODE, null, suggestions);
                        }
                        eachSuggestion.label = suggestion[suggestionsLabel];
                        eachSuggestion.code = suggestion[suggestionsCode];
                        var newSuggestion = {
                            label : stringUtil.stripAccents(eachSuggestion.label).toLowerCase(),
                            code : stringUtil.stripAccents(eachSuggestion.code).toLowerCase(),
                            original : eachSuggestion
                        };
                        if (this._labelMatchAtWordBoundaries) {
                            newSuggestion.wordBoundaries = this.__getWordBoundaries(newSuggestion.label);
                        }
                        newSuggestions.push(newSuggestion);
                    }
                    this._suggestions = newSuggestions;

                } else {
                    return this.$logError(this.INVALD_SUGGESTION_TYPE, null, suggestions);
                }

            },
            /**
             * Set the minimum number of letter required to have suggestions proposed
             * @param {Integer} nbOfLetters
             */
            setThreshold : function (nbOfLetters) {
                this.threshold = nbOfLetters;
            },

            /**
             * Provide a label for given suggestion
             * @param {Object} suggestion
             * @return {String}
             */
            suggestionToLabel : function (suggestion) {
                return suggestion.label;
            },

            /**
             * Call the callback with all possible suggestions.
             * @param {aria.core.CfgBeans:Callback} callback
             */
            getAllSuggestions : function (callback) {
                var originalSuggestions = this._suggestions;
                var nbSuggestions = originalSuggestions.length;
                var returnedSuggestions = [];
                var suggestion;
                for (var index = 0; index < nbSuggestions; index++) {
                    suggestion = originalSuggestions[index];
                    returnedSuggestions.push(suggestion.original);
                }
                this.$callback(callback, returnedSuggestions);
            },

            /**
             * Calculate word boundaries, i.e. the indices of first letters of all the words in the label (always
             * including 0 for the beginning of the word).
             */
            __getWordBoundaries : function (label) {
                var boundaryRegex = this.boundaryRegex;
                var boundaries = [0]; // mandatory 0 to check the start of the label
                while (boundaryRegex.exec(label) !== null) {
                    boundaries.push(boundaryRegex.lastIndex);
                }
                boundaryRegex.lastIndex = 0;
                return boundaries;
            }

        }
    });
})();
