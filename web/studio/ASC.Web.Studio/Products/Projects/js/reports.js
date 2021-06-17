/*
 *
 * (c) Copyright Ascensio System Limited 2010-2021
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
*/


if (!Array.prototype.findIndex) {
    Array.prototype.findIndex = function(predicate) {
        if (this == null) {
            throw new TypeError('Array.prototype.findIndex called on null or undefined');
        }
        if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;

        for (var i = 0; i < length; i++) {
            value = list[i];
            if (predicate.call(thisArg, value, i, list)) {
                return i;
            }
        }
        return -1;
    };
}

ASC.Projects.GeneratedReport = (function () {
    var attachments,
        teamlab,
        loadingBanner;

    function init() {
        attachments = Attachments;
        teamlab = Teamlab;
        loadingBanner = LoadingBanner;

        loadingBanner.displayLoading();

        teamlab.getProjectsReports({
            success: function (params, data) {
                attachments.setCreateNewEntityFlag(true);
                attachments.isLoaded = false;
                attachments.init("reports");
                attachments.loadFiles(data);

                attachments.bind("deleteFile", function (ev, fileId) {
                    loadingBanner.displayLoading();
                    teamlab.removeProjectsReport(fileId,
                    {
                        success: function() {
                            attachments.deleteFileFromLayout(fileId);
                            loadingBanner.hideLoading();
                        },
                        error: function () {
                            toastr.error(ASC.Resources.Master.ResourceJS.CommonJSErrorMsg);
                            loadingBanner.hideLoading();
                        }
                    });
                });

                loadingBanner.hideLoading();
            }
        });
    }

    return { init: init };
}());

ASC.Projects.ReportView = (function() {
    var tmplId = null,
        ProjectsJSResource = ASC.Projects.Resources.ProjectsJSResource,
        teamlab,
        reports,
        progressDialog,
        loadingBanner,
        $generateBtn;

    var init = function () {
        teamlab = Teamlab;
        reports = ASC.Projects.Reports;
        progressDialog = ASC.Projects.ReportGenerator;
        loadingBanner = LoadingBanner;

        if (location.hash.indexOf("elementNotFound") > 0) {
            ASC.Projects.Common.displayInfoPanel(ProjectsJSResource.ReportTmplNotFound, true);
        }
        
        $generateBtn = jq("#generateReport");
        
        tmplId = jq.getURLParam("tmplId");


        if (tmplId) {
            teamlab.getPrjReportTemplate({},
                tmplId,
                {
                    success: function(params, tmpl) {
                        reports.initComboboxes(tmpl);
                        reports.initFilterEvents();
                    }
                });
            initAutogeneratedPeriod();
        } else {
            reports.initComboboxes();
            reports.initFilterEvents();
        }

        $generateBtn.click(function () {
            if (jq(this).hasClass("disable")) return;
            generateReport();
            return false;
        });

        jq("#removeReport").click(function() {
            teamlab.deletePrjReportTemplate({}, tmplId, { success: function() {
                location.href = "Reports.aspx?reportType=0";
            }
            });
            return false;
        });
        jq("#updateTemplate").click(function() {
            if (jq(this).hasClass("disable")) return false;
            updateReportTemplate();
            return false;
        });
        jq(".report-filter-container, .template-params").on("change", "input, select", function() {
            jq("#updateTemplate").removeClass("disable");
        });
        jq("#autoGeneration").change(function() {
            jq("#updateTemplate").removeClass("disable");
        });
        jq("#templateTitle").keydown(function() {
            jq("#updateTemplate").removeClass("disable");
        });
        //-----popup events----//
        jq("#createTemplate").click(function() {
            showTemplatePopup();
            return false;
        });
        jq("#autoGeneration").change(function() {
            if (jq(this).is(":checked")) {
                jq(".template-params .comboBox").removeAttr("disabled");
            } else {
                jq(".template-params .comboBox").attr("disabled", "disabled");
            }
        });
        jq("#generatedPeriods").change(function() {
            var val = jq(this).val();
            switch (val) {
                case "week":
                    {
                        jq("#month").hide();
                        jq("#week").show();
                        break;
                    }
                case "month":
                    {
                        jq("#week").hide();
                        jq("#month").show();
                        break;
                    }

                default:
                    {
                        jq("#week, #month").hide();
                    }
            }
        });
        jq("#reportTemplatePopup .button.gray").click(function() {
            jq.unblockUI();
            return false;
        });
        jq("#saveTemplate").click(function () {
            if (jq(this).hasClass("disable")) return;
            var name = jq.trim(jq("#templateTitle").val());
            if (!name.length) {
                jq("#reportTemplatePopup .requiredField").addClass("requiredFieldError");
                jq("#templateTitle").focus();
                return false;
            }
            jq("#reportTemplatePopup .requiredField").removeClass("requiredFieldError");

            var generateReportFilters = reports.generateReportFilters();
            teamlab.addPrjReportTemplate({}, generateReportFilters, { success: onSaveTemplate });
            jq.unblockUI();
            return false;
        });
    };

    var generateReport = function () {
        var generateReportFilters = ASC.Projects.Reports.generateReportFilters();
        var url = ASC.Projects.Reports.generateReportUrl();

        progressDialog.generate(url);
    };

    var yellowFade = function(elem) {
        elem.css({ backgroundColor: '#F7F7F7' });
        elem.animate({ backgroundColor: '#F2F2F2' }, { queue: false, duration: 1000 });
        var resetStyle = function(self) { jq(self).removeAttr('style'); };
        setTimeout(resetStyle, 1100, this);
    };

    var onSaveTemplate = function(params, template) {
        var tmplContainer = jq("#reportsTemplates");
        var newTempl = "<li id='" + template.id + "'><a title='" + template.title + "' class='menu-report-name' href ='Reports.aspx?tmplId="
                    + template.id + "&reportType=" + template.reportType + "'>" + template.title + "</a></li>";
        tmplContainer.prepend(newTempl);
        yellowFade(tmplContainer.find("li:first"));

        var tmplTitle = tmplContainer.siblings(".reports-category.templates");
        if (tmplTitle.hasClass("display-none")) {
            tmplTitle.removeClass("display-none");
        }
    };

    var onUpdateTemplate = function (params, tmpl) {
        ASC.Projects.Common.displayInfoPanel(ProjectsJSResource.TemplateSaved);
        jq("#updateTemplate").addClass("disable");

        jq("#reportsTemplates .active").text(Encoder.htmlDecode(tmpl.title));
        jq("#reportsTemplates .active").attr("title", Encoder.htmlDecode(tmpl.title));
    };

    function initAutogeneratedPeriod() {
        if (jq("#autoGeneration").is(":checked")) {
            var select = jq("#generatedPeriods");
            var period = select.attr("data-period");
            select.find("option[value='" + period + "']").attr("selected", "selected");
            switch (period) {
                case "week":
                    jq("#week").val(jq("#week").attr("data-value")).show();
                    break;
                case "month":
                    jq("#month").val(jq("#month").attr("data-value")).show();
                    break;
            }
            jq("#hours").val(jq("#hours").attr("data-value")).show();
        }
    };

    function updateReportTemplate() {
        var id = jq.getURLParam("tmplId");
        var name = jq.trim(jq("#templateTitle").val());
        if (!name.length) {
            jq(".input-name-container").addClass("requiredFieldError");
            jq("#templateTitle").focus();
        } else {
            jq(".input-name-container").removeClass("requiredFieldError");
        }
        var generateReportFilters = reports.generateReportFilters();
        teamlab.updatePrjReportTemplate({}, id, generateReportFilters, { success: onUpdateTemplate });
    };

    function showTemplatePopup() {
        jq("#templateTitle").val(jq(".report-name").text());
        jq("#autoGeneration").removeAttr("checked");
        jq("#reportTemplatePopup .template-params .comboBox").attr("disabled", "disabled");
        
        StudioBlockUIManager.blockUI(jq('#reportTemplatePopup'), 400);
    };

    return {
        init: init
    };
})(jQuery);

ASC.Projects.Reports = (function () {
    var allProjectList,
        allusers = [],
        filter = {},
        defaultFilter,
        defaultFilterDate,
        defaultFilterInterval,
        $departmentReport,
        $projectReport,
        tmpl = {},
        basicAdvancedSelectorSettings = {
            onechosen: true,
            showSearch: true,
            sortMethod: function () { return 0; }
        },
        tagsFilter,
        projectsFilter,
        periodFilter,
        timeFilter,
        departmentFilter,
        userFilter,
        paymentFilter,
        taskStatusFilter,
        periodFilterId;

    var FilterCombo = function (id, type, describe, filterItem, hidden) {
        this.id = id;
        this.describe = describe;
        this.type = type;
        this.defaultFilter = getDefaultFilter(type);
        this.defaultText = this.defaultFilter.title;
        this.hidden = hidden;
        this.filterItem = filterItem;

        var $filter;

        this.isVisible = function () {
            return jq("#" + id).length > 0;
        }

        this.isDisplayed = function () {
            var obj = jq("#" + id);
            return obj.length > 0 && obj.is(":visible");
        }

        this.init = function (items, defIndex, onShowList) {
            $filter = jq("#" + id);
            var self = this;
            basicAdvancedSelectorSettings.itemsChoose = [self.defaultFilter].concat(items);

            $filter.advancedSelector(basicAdvancedSelectorSettings).on("showList", function (event, item) {
                $filter.html(Encoder.htmlEncode(item.title)).attr("title", Encoder.htmlDecode(item.title));

                if (item.id === self.defaultFilter.id) {
                    delete filter[self.filterItem.id];
                } else {
                    filter[self.filterItem.id] = item.id;
                }

                if (typeof onShowList === "function") {
                    onShowList(item);
                }
            });

            $filter.advancedSelector("selectBeforeShow", getSelectedFilterByUrl(items, basicAdvancedSelectorSettings.itemsChoose[defIndex], filterItem.param));
        }

        this.hide = function () {
            getFilterContainer().hide();
            this.selectDefault();
        }

        this.show = function() {
            getFilterContainer().show();
        }

        this.selectDefault = function() {
            $filter.advancedSelector("selectBeforeShow", this.defaultFilter);
        }

        this.disable = function(items) {
            $filter.advancedSelector("disable", items);
        }

        this.undisable = function(items) {
            $filter.advancedSelector("undisable", items);
        }

        function getFilterContainer() {
            return $filter.parents(".filter-item-container");
        }

        function getSelectedFilterByUrl(filterList, defFilter, urlParam) {
            var selectedFilter = defFilter,
                urlId = jq.getURLParam(urlParam, tmpl.hasOwnProperty("filter") ? "?" + tmpl.filter : undefined);

            function parseDate(dateToParse) {
                return new Date(parseInt(dateToParse.substring(0, 4), 10), parseInt(dateToParse.substring(4, 6), 10) - 1, parseInt(dateToParse.substring(6, 8), 10));
            }

            if (urlParam === "ftimeid") {
                var from = jq.getURLParam("ffrom", tmpl.hasOwnProperty("filter") ? "?" + tmpl.filter : undefined);
                var to = jq.getURLParam("fto", tmpl.hasOwnProperty("filter") ? "?" + tmpl.filter : undefined);

                if (from && to) {
                    var fromDate = parseDate(from);
                    var toDate = parseDate(to);
                    urlId = ((toDate - fromDate) / (1000 * 60 * 60 * 24)).toString(); //milliseconds to days
                }
            }

            if (urlId) {
                var findedFilter = filterList.find(function (item) { return item.id === urlId; });
                selectedFilter = findedFilter || defFilter;
            }

            return selectedFilter;
        }

        function getDefaultFilter(filterType) {
            switch (filterType) {
            case 0:
                return defaultFilter;
            case 1:
                return defaultFilterDate;
            case 2:
                return defaultFilterInterval;
            default:
                return defaultFilter;
            }
        }
    },
    FilterRadio = function (id, name, describe, value, checked) {
        this.id = id;
        this.name = name;
        this.describe = describe;
        this.value = value;
        this.checked = checked;
    },
    FilterCheck = function (id, describe, checked) {
        this.id = id;
        this.describe = describe;
        this.checked = checked;
    },
    AdvancedSelectorItem = function(id, title) {
        this.id = id.toString();
        this.title = title;
    }

    var mapAdvancedSelectorItem = function (item) { return item.id.toString(); };

    var onGetUsers = function (params, users) {
        userFilter.disable(allusers.map(mapAdvancedSelectorItem));
        userFilter.undisable(users.map(mapAdvancedSelectorItem));
        LoadingBanner.hideLoading();
    };

    var onGetProjects = function (params, projects) {
        var projectsIds = projects.map(mapAdvancedSelectorItem),
            allProjectListIds = allProjectList.map(mapAdvancedSelectorItem);

        projectsFilter.disable(allProjectListIds.filter(function(item) {
            return projectsIds.indexOf(item) < 0;
        }));
        projectsFilter.undisable(projectsIds);


        if (userFilter.isVisible()) {
            if (typeof filter.tag === "undefined") {
                Teamlab.getProfiles(params, { filter: { sortBy: "displayname" }, success: onGetUsers });
            } else {
                Teamlab.getPrjTeam(params, projectsIds, { success: onGetUsers });
            }
        }
        LoadingBanner.hideLoading();
    };


    var initComboboxes = function (template) {
        var reportType = jq.getURLParam("reportType"),
            filters = { combo: [], radio: [], check: [] },
            resources = ASC.Projects.Resources,
            projectResource = resources.ProjectResource,
            ProjectsCommonResource = resources.ProjectsCommonResource,
            reportResource = resources.ReportResource;

        defaultFilter = new AdvancedSelectorItem("default", ProjectsCommonResource.All);
        defaultFilterDate = new AdvancedSelectorItem(-1, reportResource.AnyDate);
        defaultFilterInterval = new AdvancedSelectorItem(-1, reportResource.AnyInterval);

        if (template) {
            tmpl = template;
        }

        tagsFilter = new FilterCombo("Tags", 0, projectResource.Tags, { id: "tag", param: "fpt" });
        projectsFilter = new FilterCombo("Projects", 0, projectResource.Project, { id: "project", param: "fpid" }),
        periodFilter = new FilterCombo("UpcomingIntervals", 1, reportResource.ChooseNearestMilestonesTimePeriod, { id: "timeid", param: "ftimeid" }),
        timeFilter = new FilterCombo("TimeIntervals", 2, reportResource.ChooseTimeInterval, { id: "reportTimeInterval", param: "ftime" }),
        departmentFilter = new FilterCombo("Departments", 0, resources.ViewByDepartments, { id: "departament", param: "fd" }),
        userFilter = new FilterCombo("Users", 0, resources.ViewByUsers, { id: "userId", param: "fu" }),
        paymentFilter = new FilterCombo("PaymentsStatuses", 0, reportResource.PaymentStatuses, { id: "paymentStatus", param: "fpays" }),
        taskStatusFilter = new FilterCombo("TaskStatuses", 0, reportResource.ShowTasks, { id: "status", param: "ftss" });

        var departmentRadio = new FilterRadio("departmentReport", "reportType", resources.ViewByDepartments, 0),
        userRadio = new FilterRadio("byUsers", "type_rbl", resources.ViewByUsers, 0),
        taskRadio = new FilterRadio("byTasks", "type_rbl", reportResource.ViewByUserTasks, 1),
        projectRadioVt = new FilterRadio("byProject", "type_rbl", reportResource.ViewByProjects, 2),
        projectRadio = new FilterRadio("projectReport", "reportType", reportResource.ViewByProjects, 1),
        projectClosedCheck = new FilterCheck("cbxViewClosedProjects", reportResource.ViewClosedProjects),
        taskRespCheck = new FilterCheck("cbxShowTasksWithoutResponsible", resources.TaskResource.ShowTasksWithoutResponsible);

        var filterUrl = template && template.hasOwnProperty("filter") ? "?" + template.filter : undefined;

        switch (reportType) {
            case "0":
            case "11":
                filters.combo = [tagsFilter, projectsFilter];
                break;
            case "1":
                filters.combo = [tagsFilter, projectsFilter, periodFilter];
                break;
            case "2":
                if (jq.getURLParam("fv", filterUrl) == null) {
                    tagsFilter.hidden = projectsFilter.hidden = true;
                    departmentRadio.checked = 1;
                } else {
                    departmentFilter.hidden = true;
                    projectRadio.checked = 1;
                }
                filters.combo = [departmentFilter, tagsFilter, projectsFilter];
                filters.radio = [departmentRadio, projectRadio];
                break;
            case "3":
            case "4":
                filters.combo = [departmentFilter, userFilter];
                break;
            case "5":
                if (jq.getURLParam("fv", filterUrl) == null) {
                    tagsFilter.hidden = projectsFilter.hidden = true;
                    departmentRadio.checked = 1;
                } else {
                    departmentFilter.hidden = true;
                    projectRadio.checked = 1;
                }

                filters.combo = [departmentFilter, tagsFilter, projectsFilter, userFilter, timeFilter];
                filters.radio = [departmentRadio, projectRadio];
                break;
            case "6":
                if (jq.getURLParam("fv", filterUrl) == null) {
                    tagsFilter.hidden = projectsFilter.hidden = true;
                    departmentRadio.checked = 1;
                } else {
                    departmentFilter.hidden = true;
                    projectRadio.checked = 1;
                }

                filters.combo = [departmentFilter, tagsFilter, projectsFilter, userFilter];
                filters.radio = [departmentRadio, projectRadio];
                break;
            case "7":
                projectClosedCheck.checked = jq.getURLParam("fpschecked");
                filters.combo = [departmentFilter, userFilter];
                filters.check = [projectClosedCheck];
                break;
            case "8":
                userRadio.checked = jq.getURLParam("fv", filterUrl) == null;
                taskRadio.checked = !userRadio.checked;
                filters.combo = [departmentFilter, userFilter, paymentFilter, timeFilter];
                filters.radio = [userRadio, taskRadio, projectRadioVt];
                break;
            case "9":
                taskRespCheck.checked = jq.getURLParam("nores");
                periodFilter.describe = reportResource.ChooseTasksTimePeriod;
                filters.combo = [tagsFilter, projectsFilter, userFilter, periodFilter, taskStatusFilter];
                filters.check = [taskRespCheck];
                break;
            case "10":
                periodFilter.describe = reportResource.ChooseTasksTimePeriod;
                filters.combo = [departmentFilter, userFilter, periodFilter, taskStatusFilter];
                break;
        }

        if (filters.combo.length) {
            jq("#reportFilters").prepend(jq.tmpl("projects_reportFilterList", filters));
        }

        $departmentReport = jq("#departmentReport"),
        $projectReport = jq("#projectReport");

        if (projectsFilter.isVisible()) {
            Teamlab.getPrjProjects({}, {
                success: function (params, projects) {
                    allProjectList = projects.map(function (item) {
                        return new AdvancedSelectorItem(item.id, item.title);
                    }).sort();

                    projectsFilter.init(allProjectList, 0, function () {
                        if (userFilter.isVisible() && projectsFilter.isDisplayed()) {
                            changeProject(filter.tag, filter.project, filter.userId);
                        }
                    });

                    if (typeof filter.tag !== "undefined") {
                        changeTag(filter.tag, filter.project, filter.userId);
                    }
                }
            });
        }

        if (tagsFilter.isVisible()) {
            var mappedTags = ASC.Projects.Master.Tags.map(function(item) {
                return new AdvancedSelectorItem(item.value, item.title);
            });

            tagsFilter.init(mappedTags, 0, function () {
                if (typeof allProjectList !== "undefined") {
                    changeTag(filter.tag, filter.project, filter.userId);
                    projectsFilter.selectDefault();
                }
            });
        }

        if (periodFilter.isVisible()) {
            var periods = [
                new AdvancedSelectorItem(7, "1 " + reportResource.Week),
                new AdvancedSelectorItem(14, "2 " + reportResource.Weeks),
                new AdvancedSelectorItem(21, "3 " + reportResource.Weeks),
                new AdvancedSelectorItem(28, "4 " + reportResource.Weeks),
                new AdvancedSelectorItem(35, "5 " + reportResource.Weeks2)
            ];

            periodFilter.init(periods, 0, function (item) {
                if (item.id === "-1") {
                    delete filter.fromDate;
                    delete filter.toDate;
                } else {
                    filter.reportTimeInterval = 1;

                    periodFilterId = item.id;
                    var fromDate = new Date();
                    filter.fromDate = fromDate;
                    fromDate.setDate(fromDate.getDate() + parseInt(periodFilterId));
                    filter.toDate = fromDate;
                }
            });
        }

        if (departmentFilter.isVisible()) {
            var firstDep = true,
                deps = window.GroupManager.getAllGroups().map(function (item) {
                    return new AdvancedSelectorItem(item.id, item.name);
                });
            departmentFilter.init(deps, 0, function () {
                if (firstDep) {
                    firstDep = false;
                    return;
                }

                if (userFilter.isVisible()) {
                    changeDepartment(filter.departament, filter.userId);
                }
            });
        }

        if ($departmentReport.length) {
            $departmentReport.change(function() {
                changeReportType(0);
                filter.viewType = $departmentReport.is(':checked') ? 0 : 1;
                if (filter.viewType == 0) {
                    filter.project = undefined;
                } else {
                    filter.departament = undefined;
                }
            });
        }

        if ($projectReport.length) {
            $projectReport.change(function() {
                changeReportType(1);
                filter.viewType = $departmentReport.is(':checked') ? 0 : 1;
            });
        }

        if (userFilter.isVisible()) {
            var defaultFilterUser = 0;
            var users = window.UserManager.getAllUsers(true);

            for (var userId in users) {
                if(!users.hasOwnProperty(userId)) continue;
                var item = users[userId];
                allusers.push(new AdvancedSelectorItem(item.id, item.displayName));
            }

            allusers.sort(function (a, b) {
                return (a.title > b.title) ? 1 : -1;
            });

            if (reportType === "5" && !template) {
                defaultFilterUser = allusers.findIndex(function(r) { return r.id === Teamlab.profile.id; }) + 1;
            }

            userFilter.init(allusers, defaultFilterUser, function () {
                changeResponsible(filter.userId);
                if (filter.departament && departmentFilter.isDisplayed()) {
                    changeDepartment(filter.departament, filter.userId);
                }
            });
        }

        if (paymentFilter.isVisible()) {
            var paymentStatuses = [
                new AdvancedSelectorItem("0", resources.PaymentStatus.NotChargeable),
                new AdvancedSelectorItem("1", resources.PaymentStatus.NotBilled),
                new AdvancedSelectorItem("2", resources.PaymentStatus.Billed)
            ];
            paymentFilter.init(paymentStatuses, 0);
        }

        if (timeFilter.isVisible()) {
            var timeIntervals = [
                new AdvancedSelectorItem(2, reportResource.Today),
                new AdvancedSelectorItem(3, reportResource.Yesterday),
                new AdvancedSelectorItem(5, reportResource.ThisWeek),
                new AdvancedSelectorItem(6, reportResource.LastWeek),
                new AdvancedSelectorItem(8, reportResource.ThisMonth),
                new AdvancedSelectorItem(9, reportResource.LastMonth),
                new AdvancedSelectorItem(11, reportResource.ThisYear),
                new AdvancedSelectorItem(12, reportResource.LastYear),
                new AdvancedSelectorItem(0, reportResource.Other)
            ];

            timeFilter.init(timeIntervals, 4, function(item) {
                if (item.id == '0')
                    jq('#otherInterval').show();
                else
                    jq('#otherInterval').hide();
            });
        }

        if (taskStatusFilter.isVisible()) {
            ASC.Projects.Common.initCustomStatuses(function () {
                var customStatuses = ASC.Projects.Master.customStatuses;

                function getSub(statusType) {
                    if (!customStatuses) return;

                    return customStatuses.filter(function (item) {
                        return item.statusType === statusType;
                    });
                }

                var openSub = getSub(1);
                var closedSub = getSub(2);

                var filterStatuses = [];

                if (openSub) {
                    if (openSub.length === 1) {
                        filterStatuses.push(openSub[0]);
                    } else if (openSub.length > 1) {
                        filterStatuses = [{ id: "all-1", val: -1,  title: resources.ProjectsFilterResource.StatusAllOpenTask }].concat(openSub);
                    }
                } else {
                    filterStatuses.push(
                        {
                            id: -1,
                            title: resources.ProjectsFilterResource.StatusOpenTask
                        }
                    );
                }

                if (closedSub) {
                    if (closedSub.length === 1) {
                        filterStatuses.push(closedSub[0]);
                    } else if (closedSub.length > 1) {
                        filterStatuses.push({ id: "all-2", val: -2, title: resources.ProjectsFilterResource.StatusAllClosedTask });
                        filterStatuses = filterStatuses.concat(closedSub);
                    }
                } else {
                    filterStatuses.push(
                        {
                            id: 2,
                            title: resources.ProjectsFilterResource.StatusClosedTask
                        }
                    );
                }

                filterStatuses = filterStatuses.map(function (item) {
                    return new AdvancedSelectorItem(item.id, item.title, item.val);
                });

                taskStatusFilter.init(filterStatuses, 0);
            });
        }

        jq("#reportFilters").removeClass("display-none");

        jq("[id$=fromDate]").mask(ASC.Resources.Master.DatePatternJQ);
        jq("[id$=toDate]").mask(ASC.Resources.Master.DatePatternJQ);

        jq("[id$=fromDate],[id$=toDate]").datepicker({ selectDefaultDate: true, showAnim: '' });
    };

    var initFilterEvents = function() {
        jq(".view-task-block input")
            .change(function() {
                var id = jq(this).attr("id");
                if (id == "closedTasks") {
                    jq("#UpcomingIntervals").attr("disabled", "disabled");
                    jq('#UpcomingIntervals').hide();
                } else {
                    jq("#UpcomingIntervals").removeAttr("disabled");
                    jq('#UpcomingIntervals').show();
                }
            });
    };

    function changeProject(tag, prj, user) {
        LoadingBanner.displayLoading();

        if (typeof prj === "undefined" && typeof tag !== "undefined") {
            Teamlab.getPrjProjects({ tagID: tag, prj: prj, user: user }, { filter: { tag: tag }, success: onGetProjects });
        }

        if (userFilter.isVisible()) {
            if (typeof prj === "undefined") {
                if (typeof tag === "undefined") {
                    Teamlab.getProfiles({ user: user }, { filter: { sortBy: "displayname" }, success: onGetUsers });
                }
            } else {
                Teamlab.getPrjTeam({ user: user }, prj, { success: onGetUsers });
            }
        } else {
            LoadingBanner.hideLoading();
        }
        //disable combobox
    };

    function changeDepartment(dep, user) {
        LoadingBanner.displayLoading();

        if (userFilter.isVisible()) {
            if (typeof dep !== "undefined") {
                Teamlab.getProfiles({ user: user },
                { filter: { sortBy: "displayname", filterby: "group", filtervalue: dep }, success: onGetUsers });
            } else {
                Teamlab.getProfiles({ user: user }, { filter: { sortBy: "displayname" }, success: onGetUsers });
            }
        } else {
            LoadingBanner.hideLoading();
        }
    };

    function changeResponsible(userId) {
        if (typeof userId !== "undefined") {
            jq("#cbxShowTasksWithoutResponsible").attr("disabled", "disabled").removeAttr("checked");
        } else {
            jq("#cbxShowTasksWithoutResponsible").removeAttr("disabled");
        }
    };

    function changeTag(tagID, prj, user) {
        LoadingBanner.displayLoading();
        var params = { tagID: tagID, prj: prj, user: user },
            options = { success: onGetProjects };

        if (typeof tagID !== "undefined") {
            options.filter = { tag: tagID };
        }

        Teamlab.getPrjProjects(params, options);
    };

    function changeReportType(val) {
        if (val === 0) {
            tagsFilter.hide();

            projectsFilter.hide();
            projectsFilter.undisable(allProjectList.map(mapAdvancedSelectorItem));

            if (userFilter.isVisible()) {
                userFilter.selectDefault();
                userFilter.undisable(allusers.map(mapAdvancedSelectorItem));
            }

            departmentFilter.show();
        } else {
            departmentFilter.hide();

            if (userFilter.isVisible()) {
                userFilter.selectDefault();
                userFilter.undisable(allusers.map(mapAdvancedSelectorItem));
            }

            tagsFilter.show();
            projectsFilter.show();
        }
    };

    var printReport = function() {
        window.print();
    };

    var generateReportFilters = function() {
        
        filter.reportType = jq.getURLParam("reportType") != null ? parseInt(jq.getURLParam("reportType")) : 0;

        if (jq("#cbxViewClosedProjects").length != 0) {
            filter.projectStatuses = jq("#cbxViewClosedProjects").is(':checked');
        }

        if (filter.reportType == 6 || filter.reportType == 2) {
            filter.viewType = jq("#departmentReport").is(':checked') ? 0 : 1;
            if (filter.viewType == 0) {
                filter.project = undefined;
            } else {
                filter.departament = undefined;
            }
        }
        if (filter.reportType == 8) {
            filter.viewType = jq("#byUsers").is(':checked') ? 0 : jq("#byTasks").is(':checked') ? 1 : 2;
        }

        if ((filter.reportType == 5 || filter.reportType == 8) && filter.reportTimeInterval == '0') {
            var fromDate1 = jq("[id$=fromDate]").datepicker('getDate');
            var toDate1 = jq("[id$=toDate]").datepicker('getDate');

            filter.fromDate = Teamlab.serializeTimestamp(fromDate1);
            filter.toDate = Teamlab.serializeTimestamp(toDate1);

            jq("#otherInterval .errorText").hide();
            if (jq("[id$=fromDate]").val() != "" &&
                jq("[id$=toDate]").val() != "" &&
                fromDate1.getTime() > toDate1.getTime()) {
                jq("#otherInterval .errorText").show();
            }
        }

        if (filter.reportTimeInterval === 1) {
            var fromDate = new Date();
            filter.fromDate = Teamlab.serializeTimestamp(fromDate);
            fromDate.setDate(fromDate.getDate() + parseInt(periodFilterId));
            filter.toDate = Teamlab.serializeTimestamp(fromDate);
        }

        if (filter.reportType == 11) {
            filter.noResponsible = true;
        }
        if (filter.reportType == 9) {
            filter.noResponsible = jq("#cbxShowTasksWithoutResponsible").is(':checked');
        }

        filter.name = jq.trim(jq("#templateTitle").val());
        filter.autoGenerated = jq("#autoGeneration").is(":checked");

        if (filter.autoGenerated) {
            filter.period = jq("#generatedPeriods").val();
            filter.hour = jq("#hours").val();

            if (jq("#week").is(":visible")) filter.periodItem = jq("#week").val();
            if (jq("#month").is(":visible")) filter.periodItem = jq("#month").val();
        }

        return filter;
    };

    var generateReportUrl = function() {
        var reportUrl = "generatedreport.aspx?reportType=" + filter.reportType;

        if (filter.reportTimeInterval) {
            reportUrl += "&ftime=" + filter.reportTimeInterval;
        }

        if (!filter.projectStatuses && filter.reportType == 7) {
            reportUrl += "&fps=open";
        }

        if (filter.projectStatuses) {
            reportUrl += "&fpschecked=true";
        }

        [projectsFilter, departmentFilter, userFilter, tagsFilter, taskStatusFilter, paymentFilter, periodFilter].forEach(function (item) {
            reportUrl = addFilterToUrl(reportUrl, item.filterItem);
        });

        if (filter.viewType) {
            reportUrl += "&fv=" + filter.viewType;
        }

        if (filter.noResponsible) {
            reportUrl += "&nores=" + filter.noResponsible;
        }

        if (filter.fromDate) {
            reportUrl += "&ffrom=" + filter.fromDate.split('T')[0].split('-').join('');
        }

        if (filter.toDate) {
            reportUrl += "&fto=" + filter.toDate.split('T')[0].split('-').join('');
        }

        return reportUrl;
    };

    function addFilterToUrl(reportUrl, filterItem) {
        if (!filter[filterItem.id]) return reportUrl;
        return reportUrl + jq.format("&{0}={1}", filterItem.param, filter[filterItem.id]);
    };

    var generateReportInNewWindow = function () {
        var generateReportFilters = ASC.Projects.Reports.generateReportFilters();
        var url = ASC.Projects.Reports.generateReportUrl(generateReportFilters);
        window.open(url);
    };

    var exportToCsv = function() {
        window.location.href = window.location.href + "&format=csv";
    };

    var exportToHTML = function() {
        window.location.href = window.location.href + "&format=html";
    };

    var exportToXml = function() {
        window.location.href = window.location.href + "&format=xml";
    };

    var generateReportByUrl = function(url) {
        open(url, "displayReportWindow", "status=yes,toolbar=yes,menubar=yes,scrollbars=yes");
    };

    return {
        initComboboxes: initComboboxes,
        initFilterEvents: initFilterEvents,
        printReport: printReport,
        generateReportFilters: generateReportFilters,
        generateReportUrl: generateReportUrl,
        generateReportInNewWindow: generateReportInNewWindow,
        exportToCsv: exportToCsv,
        exportToHTML: exportToHTML,
        exportToXml: exportToXml,
        generateReportByUrl: generateReportByUrl
    };
})();
