/*
 * Copyright 2013 Amadeus s.a.s.
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

Aria.classDefinition({
    $classpath : "test.aria.widgets.form.multiautocomplete.focusIssueOnEdit.MACFocusIssueOnEditTest",
    $extends : "test.aria.widgets.form.multiautocomplete.BaseMultiAutoCompleteTestCase",
    $constructor : function () {

        this.data = {
            ac_airline_values : ["India", "Singapore", "America"],
            freeText : true
        };
        this.$BaseMultiAutoCompleteTestCase.constructor.call(this);

    },
    $prototype : {
        /**
         * This method is always the first entry point to a template test Start the test by focusing the first field
         */
        runTemplateTest : function () {
            // initial test for all the suggestions added
            this.checkSelectedItems(3);
            this._fireClickOnSuggestion(1, "_afterFirstClick");
        },
        _afterFirstClick : function () {
            this.checkHighlightedElementsIndices([2]);
            // item is already highlighted, it goes to edit mode now
            this._fireClickOnSuggestion(1, "_afterEditSingapore");
        },
        _afterEditSingapore : function () {
            aria.core.Timer.addCallback({
                fn : this._selectSuggestion,
                scope : this,
                delay : 10
            });
        },
        _selectSuggestion : function () {
            this.type({
                text : ["fi", "[enter]"],
                cb : {
                    fn : this._checkFocusAfterSelection,
                    scope : this
                },
                delay : 500
            });
        },
        _checkFocusAfterSelection : function () {
            this.checkSelectedItems(3, ["India", "Finnair", "America"]);
            var inputField = this._getField();
            var focusedElement = Aria.$window.document.activeElement;
            this.assertEquals(inputField, focusedElement, "Input field and focusedElement are not same");
            this.end();
        }
    }
});
