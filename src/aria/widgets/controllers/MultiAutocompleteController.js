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

    // shortcut
    var typeUtil;

    /**
     * Controller for the AutoComplete widget. This controller manage the keystroke forwarded by the autocomplete
     * widget, and the resources handler.
     */
    Aria.classDefinition({
        $classpath : "aria.widgets.controllers.MultiAutocompleteController",
        $extends : "aria.widgets.controllers.DropDownListController",
        $dependencies : ["aria.DomEvent", "aria.utils.Json", "aria.templates.RefreshManager",
                "aria.widgets.controllers.reports.DropDownControllerReport", "aria.utils.Type",
                "aria.html.controllers.Suggestions", "aria.utils.Delegate", "aria.utils.Array"],
        $resources : {
            res : "aria.widgets.WidgetsRes"
        },
        $onload : function () {
            typeUtil = aria.utils.Type;
        },
        $onunload : function () {
            typeUtil = null;
        },
        $constructor : function () {
            this.$DropDownListController.constructor.call(this);

            /**
             * Freetext allowed, if it is set to true suggestion can be edited on double click
             * @type Boolean
             */
            this.freeText = false;

            /**
             * To Remove focus when call back has no suggestions.
             * @type Boolean
             */
            this._resetFocus = false;
            /**
             * To edit the suggestion on double click
             * @type Boolean
             */
            this._editMode = false;
            /**
             * All the selected suggestions
             * @type Array
             */
            this._selectedSuggestions = [];
            /**
             * All selected suggestions labels
             */
            this._selectedSuggestionsLabelsArray = [];

            // Inherited from aria.html.controllers.Suggestions
            this._init();

        },
        $destructor : function () {
            this.dispose();
            this.$DropDownListController.$destructor.call(this);
        },
        $prototype : {
            /**
             * Override the $init method to be able to extend from multiple classes
             * @param {Object} p the prototype object being built
             */
            $init : function (p) {
                var parent = aria.html.controllers.Suggestions.prototype;
                for (var key in parent) {
                    if (parent.hasOwnProperty(key) && !p.hasOwnProperty(key)) {
                        p[key] = parent[key];
                    }
                }
            },

            /**
             * Return the template to use in the dropdown
             * @return {String}
             */
            getDefaultTemplate : function () {
                return this._resourcesHandler.getDefaultTemplate();
            },

            /**
             * override TextDataController.checkText
             * @param {String} text
             * @return {aria.widgets.controllers.reports.DropDownControllerReport}
             */
            checkText : function (text) {

                var dataModel = this._dataModel;

                if (text !== '' && text !== dataModel.text) {
                    dataModel.text = text;
                    this._resourcesHandler.getSuggestions(text, {
                        fn : this._suggestionsCallback,
                        scope : this,
                        args : {
                            nextValue : text,
                            triggerDropDown : false
                        }
                    });
                    return null;
                }
                var report = new aria.widgets.controllers.reports.DropDownControllerReport();

                // an empty field is usually not considered as an error
                if (text === '') {
                    dataModel.value = null;
                    dataModel.text = '';
                    report.ok = true;
                    report.value = null;
                } else {
                    if (this.freeText) {
                        report.ok = true;
                    } else {
                        if (!dataModel.value) {
                            report.ok = false;
                            report.value = null;
                            report.errorMessages.push(this.res.errors["40020_WIDGET_AUTOCOMPLETE_VALIDATION"]);
                        }

                    }
                    if (dataModel.value) {
                        report.value = dataModel.value;
                    }

                }
                return report;
            },

            /**
             * OVERRIDE Verify a given value
             * @param {Object} value
             * @return {aria.widgets.controllers.reports.DropDownControllerReport}
             * @override
             */
            checkValue : function (value) {
                var report = new aria.widgets.controllers.reports.DropDownControllerReport(), dataModel = this._dataModel, rangeMatch = null, reportVal = null;
                var patt = new RegExp("^[a-z]{1}\\d+-\\d+");
                if (value == null || aria.utils.Array.isEmpty(value)) {
                    // can be null either because it bound to null or because it is bind to value or request is in
                    // progress
                    dataModel.text = (this._pendingRequestNb > 0 && dataModel.text) ? dataModel.text : "";
                    dataModel.value = null;
                    report.ok = true;
                    reportVal = null;
                } else if (value && !typeUtil.isString(value)) {
                    if (aria.core.JsonValidator.check(value, this._resourcesHandler.SUGGESTION_BEAN)) {
                        var text = this._getLabelFromSuggestion(value);
                        dataModel.text = text;
                        report.ok = true;
                        reportVal = value;
                        dataModel.value = this._selectedSuggestions;
                    } else {
                        dataModel.value = null;
                        report.ok = true;
                        this.$logError("Value does not match definition for this autocomplete: "
                                + this._resourcesHandler.SUGGESTION_BEAN, [], value);
                        reportVal = null;
                    }
                } else {
                    if (typeUtil.isString(value)) {
                        dataModel.text = value;
                        reportVal = value;
                    }
                    if (patt.test(value) && dataModel.listContent) {
                        rangeMatch = dataModel.listContent;
                    }
                    if (!this.freeText) {
                        report.ok = false;
                        dataModel.value = null;
                    } else {
                        report.ok = true;
                        reportVal = value;
                    }
                }
                report.value = rangeMatch || reportVal;
                report.text = dataModel.text;

                return report;
            },

            /**
             * Check for the case when the displayedValue will change
             * @protected
             * @param {Integer} charCode
             * @param {Integer} keyCode
             * @param {String} nextValue the value that should be next in the textfield
             * @param {Integer} caretPos
             * @return {aria.widgets.controllers.reports.ControllerReport}
             */
            _checkInputKey : function (charCode, keyCode, nextValue, caretPosStart, caretPosEnd) {

                var checkMaxOptionsFlag = this.maxOptions ? this.maxOptions > this._selectedSuggestions.length : true;
                this._dataModel.value = this.freeText ? nextValue : null;
                this._dataModel.text = nextValue;
                if (this._typeTimeout) {
                    clearTimeout(this._typeTimeout);
                    this._typeTimeout = null;
                }
                var controller = this, domEvent = aria.DomEvent;

                if (keyCode == domEvent.KC_ARROW_DOWN && !nextValue && controller.expandButton) {
                    controller.toggleDropdown("", !!controller._listWidget);
                    return;
                }

                if (this._editMode) {
                    this._editMode = false;
                }

                this._typeTimeout = setTimeout(function () {
                    controller._typeTimeout = null;
                    controller._pendingRequestNb += 1;
                    if (checkMaxOptionsFlag) {
                        controller._resourcesHandler.getSuggestions(nextValue, {
                            fn : controller._suggestionsCallback,
                            scope : controller,
                            args : {
                                nextValue : nextValue,
                                triggerDropDown : true,
                                caretPosStart : caretPosStart,
                                caretPosEnd : caretPosEnd
                            }
                        });
                    }
                }, 10);
                return null;

            },
            /**
             * Add the selected suggestion(s) to widget
             * @param {aria.widgets.form.MultiAutoComplete} ref
             * @param {aria.widgets.controllers.reports.DropDownControllerReport} report
             * @param {Object} arg Optional parameters
             */

            _addMultiselectValues : function (ref, report, arg) {
                var patt = new RegExp("^[a-z]{1}\\d+-\\d+");

                var isValid, label;
                if (this._editMode) {
                    isValid = typeUtil.isString(report.value);
                } else {
                    isValid = typeUtil.isArray(report.value) || typeUtil.isObject(report.value);
                }

                if (this.freeText && arg && arg.eventName == "blur" && report.value) {
                    isValid = true;
                }
                if (report.value && report.value[0] && patt.test(report.value[0].entry)) {
                    isValid = true;
                }
                if (isValid && report.value && !ref._dropdownPopup) {
                    var suggestionsMarkup = "", domUtil = aria.utils.Dom;
                    if (aria.utils.Type.isArray(report.value)) {
                        var maxOptionsLength = (this.maxOptions)
                                ? aria.utils.Math.min((this.maxOptions - this._selectedSuggestions.length), report.value.length)
                                : report.value.length;
                        for (var i = 0; i < maxOptionsLength; i++) {
                            suggestionsMarkup += this._generateSuggestionMarkup(report.value[i], ref);
                        }
                    } else {
                        label = report.value.label ? report.value.label : report.value;
                        suggestionsMarkup = this._generateSuggestionMarkup(report.value, ref);
                    }
                    domUtil.insertAdjacentHTML(ref._textInputField, "beforeBegin", suggestionsMarkup);
                    ref._textInputField.value = "";
                    if (ref._frame.getChild(0).lastChild !== ref._textInputField) {

                        domUtil.insertAdjacentHTML(ref._frame.getChild(0).lastChild, "afterEnd", "<span></span>");
                        domUtil.replaceDomElement(ref._frame.getChild(0).lastChild, ref._textInputField);
                    }

                    // ref._textInputField.focus();
                    if (this._editMode) {
                        this._editMode = false;
                    }
                    ref._updateModel(this._selectedSuggestions);

                }
            },
            /**
             * Generate markup for selected suggestion
             * @param {String} report
             * @param {aria.widgets.form.MultiAutoComplete} ref
             * @return {String}
             */
            _generateSuggestionMarkup : function (value, ref) {
                var suggestionMarkup, checkExistingValue = false;
                var label = value.label || value;
                var editdelegateId = aria.utils.Delegate.add({
                    fn : this._onEditEvent,
                    scope : this,
                    args : ref
                });
                for (var k = 0; k < this._selectedSuggestions.length; k++) {
                    if (this._selectedSuggestions[k].label == value) {
                        checkExistingValue = true;
                        break;
                    }
                }
                if (!checkExistingValue) {
                    this._selectedSuggestions.push(value);
                    this._selectedSuggestionsLabelsArray.push(label);
                }
                suggestionMarkup = "<div class='xMultiAutocomplete_options' "
                        + aria.utils.Delegate.getMarkup(editdelegateId)
                        + "><span class='xMultiAutocomplete_Option_Text' >" + label
                        + "</span><a href='javascript:void(0);' class='closeBtn'></a></div>";
                return suggestionMarkup;

            },
            /**
             * Handling click and double click event for close and edit
             * @param {aria.utils.Event} event
             * @param {aria.widgets.form.MultiAutoComplete} ref
             */

            _onEditEvent : function (event, ref) {
                if (event.type == "click") {
                    var element = event.target;
                    if (element.className === "closeBtn") {
                        this._removeMultiselectValues(element, ref, event);
                    }
                }
                if (event.type == "dblclick" && this.freeText) {
                    var element = event.target;
                    if (element.className == "xMultiAutocomplete_Option_Text") {
                        this._editMultiselectValue(element, ref, event);
                    }
                }
                /*if (ref._binding) {
                    aria.utils.Json.setValue(ref._binding.inside, ref._binding.to, this._selectedSuggestions);
                    // ref._reactToControllerReport();
                }*/
            },
            /**
             * To remove suggestion on click of close
             * @param {aria.utils.HTML} domElement
             * @param {aria.widgets.form.MultiAutoComplete} ref
             * @param {aria.utils.Event} event
             */
            _removeMultiselectValues : function (domElement, ref, event) {
                var parent = domElement.parentNode, domUtil = aria.utils.Dom;
                var label = parent.firstChild.innerText || parent.firstChild.textContent;
                this._removeValues(label);
                domUtil.removeElement(parent);
                if (event.type == "click") {
                    ref.getTextInputField().focus();
                }
                ref._updateModel(this._selectedSuggestions);
                // aria.templates.RefreshManager.resume();

            },
            /**
             * To edit suggestion on doubleclick
             * @param {aria.utils.HTML} domElement
             * @param {aria.widgets.form.MultiAutoComplete} ref
             * @param {aria.utils.Event} event
             */
            _editMultiselectValue : function (domElement, ref, event) {
                var domUtil = aria.utils.Dom, label, arg = {};
                label = domElement.textContent || domElement.innerText;
                ref.setHelpText(false);
                domUtil.replaceDomElement(domElement.parentNode, ref._textInputField);
                this._removeValues(label);
                ref._textInputField.focus();
                var report = this.checkValue(label);
                report.caretPosStart = 0;
                report.caretPosEnd = label.length;
                ref._hasFocus = true;
                ref.$TextInput._reactToControllerReport.call(ref, report, arg);
                this._editMode = true;
                ref._updateModel(this._selectedSuggestions);
            },

            _removeValues : function (label) {
                var indexToRemove, arrayUtil = aria.utils.Array;
                arrayUtil.forEach(this._selectedSuggestions, function (obj, index) {
                    if (obj.label == label) {
                        indexToRemove = index;
                    }
                });
                arrayUtil.removeAt(this._selectedSuggestions, indexToRemove);
                arrayUtil.remove(this._selectedSuggestionsLabelsArray, label);
            },

            /**
             * Callback after the asynchronous suggestions
             * @protected
             * @param {Array} suggestions
             * @param {Object} args nextValue and triggerDropDown properties
             */
            _suggestionsCallback : function (res, args) {

                this._pendingRequestNb -= 1;

                var suggestions = null;
                var error = null;
                var repositionDropDown = false;
                if (res != null) {
                    if ("suggestions" in res) {
                        suggestions = res.suggestions;
                        error = res.error;
                        repositionDropDown = res.repositionDropDown;
                    } else {
                        suggestions = res;
                    }
                }

                // default selection is first element
                var nextValue = args.nextValue, triggerDropDown = args.triggerDropDown, matchValueIndex = -1, dataModel = this._dataModel;

                // don't do anything if displayedValue has changed
                // -> user has typed something else before the callback returned
                if (dataModel && (nextValue == dataModel.text) || (args.keepSelectedValue)) {

                    // a null return is different from an empty array
                    // null : not enought letters
                    // empty array : no suggestions for this entry
                    var suggestionsAvailable = (suggestions !== null);

                    if (suggestionsAvailable) {
                        if (args.keepSelectedValue) {
                            var code = dataModel.value ? dataModel.value.code : null;
                            for (var i = 0; i < suggestions.length; i += 1) {
                                suggestions[i].exactMatch = (suggestions[i].code === code);
                            }
                        }
                        // reformat the suggestions to be compatible with the list widget
                        matchValueIndex = this._prepareSuggestionsAndMatch(suggestions, nextValue);

                    } else {
                        suggestions = [];
                    }
                    var hasSuggestions = suggestions.length > 0;
                    // for resetting focus when suggestions are empty
                    this._resetFocus = suggestions.length > 0 || !(this.expandButton);
                    aria.templates.RefreshManager.stop();
                    // as item are changed, force datamodel to change to activate selection
                    var jsonUtils = aria.utils.Json;
                    jsonUtils.setValue(dataModel, 'selectedIdx', -1);

                    // update datamodel through setValue to update the list has well
                    jsonUtils.setValue(dataModel, 'listContent', suggestions);
                    jsonUtils.setValue(dataModel, 'selectedIdx', matchValueIndex);

                    var report = new aria.widgets.controllers.reports.DropDownControllerReport();
                    report.text = nextValue;
                    report.caretPosStart = args.caretPosStart;
                    report.caretPosEnd = args.caretPosEnd;

                    if (matchValueIndex != -1) {
                        dataModel.value = dataModel.listContent[matchValueIndex].value;
                    } else {
                        if (this.freeText && nextValue) {
                            // return the text from the autocomplete
                            dataModel.value = nextValue;
                        } else {
                            dataModel.value = null;
                        }
                    }

                    report.value = dataModel.value;
                    report.cancelKeyStroke = true;

                    if (error != null) {
                        report.ok = !error;
                    } else {
                        if (!this.freeText && suggestionsAvailable && !hasSuggestions) {
                            report.ok = false;
                        } else {
                            report.ok = true;
                        }
                    }
                    if (report.ok && suggestionsAvailable && !hasSuggestions) {
                        dataModel.value = nextValue;
                    }
                    report.displayDropDown = hasSuggestions && triggerDropDown;
                    report.repositionDropDown = repositionDropDown;
                    var arg = {};
                    arg.stopValueProp = true;
                    // arg.keyStroke = true;
                    this._raiseReport(report, arg);
                    aria.templates.RefreshManager.resume();
                }
            },

            /**
             * reformat the suggestions to be compatible with the list widget and search for perfect match
             * @protected
             * @param {Array} suggestions
             * @param {String} textEntry
             * @return {Number} index of the first exact match, or -1
             */
            _prepareSuggestionsAndMatch : function (suggestions, textEntry) {
                var matchValueIndex = -1, suggestion;
                for (var index = 0, len = suggestions.length, label; index < len; index += 1) {
                    suggestion = suggestions[index];
                    // if it's the first exact match, store it
                    if (matchValueIndex == -1) {
                        if (suggestion.exactMatch) {
                            matchValueIndex = index;
                        }
                    }
                    label = this._getLabelFromSuggestion(suggestion);
                    var tmp = {
                        entry : textEntry,
                        label : label,
                        value : suggestion
                    };
                    suggestions[index] = tmp;
                }
                return matchValueIndex;
            },

            /**
             * Retrieve the label to display in the textfield for a given suggestion.
             * @protected
             * @param {Object} value
             */
            _getLabelFromSuggestion : function (value) {
                return this._resourcesHandler.suggestionToLabel(value);
            },
            /**
             * Get all the selected suggestions
             * @return {Array}
             */
            getSelectedSuugestions : function () {
                return this._selectedSuggestions;
            }

        }
    });
})();
