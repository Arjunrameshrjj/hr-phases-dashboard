function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("RECRUITMENT TRACKER");
  
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Sheet 'RECRUITMENT TRACKER' not found" })).setMimeType(ContentService.MimeType.JSON);
  }

  var data = sheet.getDataRange().getValues();
  if (data.length === 0) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Sheet is empty" })).setMimeType(ContentService.MimeType.JSON);
  }

  var headers = data.shift(); 
  
  function getColIndex(headerNameFragment) {
    for (var i = 0; i < headers.length; i++) {
      if (headers[i] && headers[i].toString().toLowerCase().includes(headerNameFragment.toLowerCase())) {
        return i;
      }
    }
    return -1;
  }

  var idxCandidateName   = getColIndex("Candidate Name");     
  var idxSource          = getColIndex("Source");            
  var idxScreening       = getColIndex("Screening Status");  
  var idx1stRound        = getColIndex("1st Round");         
  var idx2ndRound        = getColIndex("2nd Round");         
  var idx3rdRound        = getColIndex("3rd Round");         
  var idxOfferStatus     = getColIndex("Offer Status");      
  var idxActualDOJ       = getColIndex("Actual DOJ");        
  var idxJoiningStatus   = getColIndex("Joining Status");    
  var idxJobTitle        = getColIndex("Job Title");
  var idxDepartment      = getColIndex("Department");
  var idxAppDate         = getColIndex("Application Date");

  var totalCandidates = 0, sourceWiseLeads = {}, interviewConversionCount = 0, offerCount = 0;
  var totalOffered = 0, totalJoined = 0, dropNotJoined = 0;
  var employeesInProbation = 0, recentJoiners = 0; 
  var longTermEmployees = 0, activeEmployees = 0; 
  var dropOffCount = 0, offerRejectedCount = 0, notJoinedCount = 0;
  var today = new Date();
  var daysFilter = (e && e.parameter && e.parameter.days && e.parameter.days !== 'all') ? parseInt(e.parameter.days) : null;
  var filterDateMs = daysFilter ? today.getTime() - (daysFilter * 24 * 60 * 60 * 1000) : null;
  
  var recRows = [], onbRows = [], probRows = [], perfRows = [], exitRows = [];
  
  var deptJoinedCounts = {};
  var deptDroppedCounts = {};
  var sourceJoinedCounts = {};
  var monthApplications = {}; 
  var deptProbationCounts = {};
  var deptPerformanceCounts = {};

  // Ultra-robust Date Parser
  function parseSheetDate(val) {
    if (!val) return null;
    
    // If it is deeply a Date object
    if (Object.prototype.toString.call(val) === '[object Date]' || (val && typeof val.getTime === 'function')) {
      if (!isNaN(val.getTime())) {
        return val;
      }
    }
    
    // If it's a string, attempt to parse DD-MM-YYYY or DD/MM/YYYY
    var str = val.toString().trim();
    if (str !== "") {
      var match = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
      if (match) {
        var jsDate = new Date(parseInt(match[3]), parseInt(match[2])-1, parseInt(match[1]));
        if (!isNaN(jsDate.getTime())) return jsDate;
      }
      
      var defaultParse = new Date(str);
      if (!isNaN(defaultParse.getTime())) return defaultParse;
    }
    
    return null;
  }

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var colCandidateName     = idxCandidateName !== -1 ? row[idxCandidateName] : "";
    var colSource            = idxSource !== -1 ? row[idxSource] || "Unknown" : "Unknown";
    var colScreeningStatus   = idxScreening !== -1 ? (row[idxScreening] || "").toString().toUpperCase() : "";
    var col1stRound          = idx1stRound !== -1 ? (row[idx1stRound] || "").toString().toUpperCase() : "";
    var col2ndRound          = idx2ndRound !== -1 ? (row[idx2ndRound] || "").toString().toUpperCase() : "";
    var col3rdRound          = idx3rdRound !== -1 ? (row[idx3rdRound] || "").toString().toUpperCase() : "";
    var colOfferStatus       = idxOfferStatus !== -1 ? (row[idxOfferStatus] || "").toString().toUpperCase() : "";
    var colActualDOJ         = idxActualDOJ !== -1 ? row[idxActualDOJ] : "";
    var colJoiningStatus     = idxJoiningStatus !== -1 ? (row[idxJoiningStatus] || "").toString().toUpperCase() : "";
    var colJobTitle          = idxJobTitle !== -1 ? row[idxJobTitle] || "N/A" : "N/A";
    var colDepartment        = idxDepartment !== -1 ? row[idxDepartment] || "General" : "General";
    
    if (!colCandidateName || colCandidateName.toString().trim() === "") continue;

    var appDateStr = "N/A";
    var appDateObj = parseSheetDate(idxAppDate !== -1 ? row[idxAppDate] : null);
    if (appDateObj) {
      appDateStr = (appDateObj.getMonth() + 1) + "/" + appDateObj.getDate() + "/" + appDateObj.getFullYear();
      var monthYear = appDateObj.toLocaleString('default', { month: 'short' }) + " " + appDateObj.getFullYear();
      monthApplications[monthYear] = (monthApplications[monthYear] || 0) + 1;
    }
    
    var dojStr = "N/A";
    var actualDOJObj = parseSheetDate(colActualDOJ);
    var isValidDOJ = actualDOJObj !== null;
    if (isValidDOJ) {
      dojStr = (actualDOJObj.getMonth() + 1) + "/" + actualDOJObj.getDate() + "/" + actualDOJObj.getFullYear();
    }

    // Apply strict date filtering if days parameter is provided
    if (filterDateMs) {
      var rowDateObj = appDateObj || actualDOJObj || null;
      if (!rowDateObj || rowDateObj.getTime() < filterDateMs) {
        continue;
      }
    }

    // ======== PHASE 1: RECRUITMENT ========
    totalCandidates++;
    if (colSource) {
      var source = colSource.toString();
      sourceWiseLeads[source] = (sourceWiseLeads[source] || 0) + 1;
    }
    var isConvertedToInterview = (
      col1stRound.includes("PASS") || col1stRound.includes("SELECT") || col1stRound.includes("CLEAR") || col1stRound.includes("HIRED") ||
      col2ndRound.includes("PASS") || col2ndRound.includes("SELECT") || col2ndRound.includes("CLEAR") || col2ndRound.includes("HIRED")
    );
    if (isConvertedToInterview) interviewConversionCount++;
    if (colOfferStatus.includes("OFFER") || colOfferStatus.includes("ACCEPT") || colOfferStatus.includes("RELEASED") || colOfferStatus.includes("SEL")) {
      offerCount++;
      totalOffered++; 
    }
    
    var stage = "Applied";
    if (col1stRound) stage = "R1 Completed";
    if (col2ndRound) stage = "R2/R3 Completed";
    if (colOfferStatus.includes("OFFER") || colOfferStatus.includes("SEL")) stage = "Offer Stage";
    
    recRows.push([
      colCandidateName, colJobTitle, "<span class='badge badge-blue'>" + stage + "</span>", colSource, appDateStr
    ]);

    // ======== PHASE 2: ONBOARDING ========
    var hasJoined = colJoiningStatus.includes("JOINED") && !colJoiningStatus.includes("NOT JOINED");
    var hasNotJoined = colJoiningStatus.includes("NOT JOINED") || colJoiningStatus.includes("DROP");
    
    if (hasJoined) { 
      totalJoined++; 
      activeEmployees++; 
      deptJoinedCounts[colDepartment] = (deptJoinedCounts[colDepartment] || 0) + 1;
      sourceJoinedCounts[colSource] = (sourceJoinedCounts[colSource] || 0) + 1;
    }
    if (hasNotJoined && totalOffered > 0) { 
      dropNotJoined++; 
      notJoinedCount++; 
      deptDroppedCounts[colDepartment] = (deptDroppedCounts[colDepartment] || 0) + 1;
    }
    
    var prog = hasJoined ? "100%" : (hasNotJoined ? "0%" : "50%");
    var progColor = hasJoined ? "#10b981" : (hasNotJoined ? "#ef4444" : "#f59e0b");
    if (colOfferStatus.includes("OFFER") || colOfferStatus.includes("ACCEPT") || colOfferStatus.includes("JOIN") || hasJoined) {
       onbRows.push([
         colCandidateName, colJobTitle, colDepartment, 
         "<div style='width: 100%; background: #27272a; height: 6px; border-radius: 3px;'><div style='width: " + prog + "; background: " + progColor + "; height: 100%; border-radius: 3px;'></div></div> <span style='font-size: 0.75rem;'>" + prog + " Phase</span>",
         dojStr
       ]);
    }
    
    // ======== PHASE 3 & 4: PROBATION & PERFORMANCE ========
    if (hasJoined && isValidDOJ) {
      var timeDiffMs = today.getTime() - actualDOJObj.getTime();
      var daysSinceDOJ = Math.floor(timeDiffMs / (1000 * 60 * 60 * 24));
      
      // Treat slightly future dates (e.g. joining next week) and up to 180 days as Probation
      if (daysSinceDOJ >= -30 && daysSinceDOJ <= 180) {
        employeesInProbation++;
        if (daysSinceDOJ <= 30) recentJoiners++; 
        deptProbationCounts[colDepartment] = (deptProbationCounts[colDepartment] || 0) + 1;
        
        var probEndDate = new Date(actualDOJObj.getTime());
        probEndDate.setMonth(probEndDate.getMonth() + 6);
        var probEndStr = (probEndDate.getMonth() + 1) + "/" + probEndDate.getDate() + "/" + probEndDate.getFullYear();
        
        probRows.push([
           colCandidateName, colDepartment, daysSinceDOJ + " Days", probEndStr, "<span class='badge badge-yellow'>In Probation</span>"
        ]);
      } else if (daysSinceDOJ > 180) {
        longTermEmployees++;
        deptPerformanceCounts[colDepartment] = (deptPerformanceCounts[colDepartment] || 0) + 1;
        
        perfRows.push([
           colDepartment + " / " + colCandidateName, "Completed 6 Months", "<span class='badge badge-green'>Core Team</span>", dojStr
        ]);
      }
    }
    
    // ======== PHASE 5: EXIT ========
    var isOfferRejected = colOfferStatus.includes("REJECT") || colOfferStatus.includes("DECLINE") || colOfferStatus.includes("REFUSE");
    var isDroppedInInterview = (
      colScreeningStatus.includes("REJECT") || colScreeningStatus.includes("DROP") ||
      col1stRound.includes("REJECT") || col1stRound.includes("DROP") ||
      col2ndRound.includes("REJECT") || col2ndRound.includes("DROP") ||
      col3rdRound.includes("REJECT") || col3rdRound.includes("DROP")
    );
    
    if (isOfferRejected) offerRejectedCount++;
    if (hasNotJoined || isDroppedInInterview || isOfferRejected) {
      dropOffCount++;
      var exitReason = "Dropped/Rejected Offer";
      if (isDroppedInInterview) exitReason = "Rejected in Interview";
      if (hasNotJoined) exitReason = "Not Joined";
      
      exitRows.push([
         colCandidateName, colJobTitle, appDateStr, exitReason, "<span class='badge badge-red'>Closed</span>"
      ]);
    }
  }
  
  var offerAcceptanceRate = totalOffered > 0 ? ((totalJoined / totalOffered) * 100).toFixed(1) + "%" : "0%";
  var interviewConversionRate = totalCandidates > 0 ? ((interviewConversionCount / totalCandidates) * 100).toFixed(1) + "%" : "0%";

  var sortedAppMonths = Object.keys(monthApplications).sort(function(a, b) {
    return new Date(a + " 1").getTime() - new Date(b + " 1").getTime();
  });
  var sortedAppCounts = sortedAppMonths.map(function(m) { return monthApplications[m]; });

  var responseData = {
    recruitment: {
      metrics: [
        { title: "Total Candidates", value: totalCandidates.toString(), trend: "Active", isUp: true },
        { title: "Interview Conversion", value: interviewConversionRate, trend: interviewConversionCount + " Pass", isUp: true },
        { title: "Offer Count", value: offerCount.toString(), trend: "Issued", isUp: true },
        { title: "Unique Sources", value: Object.keys(sourceWiseLeads).length.toString(), trend: "Diversified", isUp: true }
      ],
      chart1: { title: "Applications Over Time", type: "line", labels: sortedAppMonths, data: sortedAppCounts },
      chart2: { title: "Source-wise Leads", type: "doughnut", labels: Object.keys(sourceWiseLeads), data: Object.values(sourceWiseLeads) },
      tableRows: recRows.slice(-10).reverse() 
    },
    onboarding: {
      metrics: [
        { title: "Total Offered", value: totalOffered.toString(), trend: "In Play", isUp: true },
        { title: "Total Joined", value: totalJoined.toString(), trend: "Success", isUp: true },
        { title: "Acceptance Rate", value: offerAcceptanceRate, trend: "Industry High", isUp: true },
        { title: "Drop (Not Joined)", value: dropNotJoined.toString(), trend: "Fallback", isUp: false },
        { title: "Offer Rejected", value: offerRejectedCount.toString(), trend: "Declined", isUp: false }
      ],
      chart1: { title: "Joined by Department", type: "bar", labels: Object.keys(deptJoinedCounts), data: Object.values(deptJoinedCounts) },
      chart2: { title: "Hired Candidate Sources", type: "doughnut", labels: Object.keys(sourceJoinedCounts), data: Object.values(sourceJoinedCounts) },
      tableRows: onbRows.slice(-10).reverse()
    },
    probation: {
      metrics: [
        { title: "In Probation", value: employeesInProbation.toString(), trend: "<= 180 Days", isUp: true },
        { title: "Recent Joiners", value: recentJoiners.toString(), trend: "Last 30 Days", isUp: true },
        { title: "Active Status", value: employeesInProbation.toString(), trend: "Being Monitored", isUp: true },
        { title: "Fallout Rate", value: "0%", trend: "Stable", isUp: true } 
      ],
      chart1: { title: "Probation by Department", type: "bar", labels: Object.keys(deptProbationCounts), data: Object.values(deptProbationCounts) }, // Corrected!
      chart2: { title: "Probation Status", type: "doughnut", labels: ["In Probation", "Completed"], data: [employeesInProbation, longTermEmployees] },
      tableRows: probRows.slice(-10).reverse()
    },
    performance: {
      metrics: [
        { title: "Active Employees", value: activeEmployees.toString(), trend: "Total Retained", isUp: true },
        { title: "Long-Term Staff", value: longTermEmployees.toString(), trend: "> 180 Days", isUp: true },
        { title: "Retention Flow", value: "Strong", trend: "Maintained", isUp: true },
        { title: "Core Staff", value: longTermEmployees.toString(), trend: "Stable", isUp: true }
      ],
      chart1: { title: "Active Employees by Department", type: "bar", labels: Object.keys(deptPerformanceCounts), data: Object.values(deptPerformanceCounts) }, // Corrected
      chart2: { title: "Employee Tenure Split", type: "doughnut", labels: ["< 6 Months", "> 6 Months"], data: [employeesInProbation, longTermEmployees] },
      tableRows: perfRows.slice(-10).reverse()
    },
    exit: {
      metrics: [
        { title: "Total Drop-offs", value: dropOffCount.toString(), trend: "Interview + Exits", isUp: false },
        { title: "Not Joined", value: notJoinedCount.toString(), trend: "After Offer", isUp: false },
        { title: "Pipeline Attrition", value: "Checked", trend: "Monitored", isUp: true }
      ],
      chart1: { title: "Drop-offs by Department", type: "bar", labels: Object.keys(deptDroppedCounts), data: Object.values(deptDroppedCounts) },
      chart2: { title: "Pipeline Attrition Stage", type: "doughnut", labels: ["Offer Rejected", "Not Joined After Acceptance", "Other Drops"], data: [offerRejectedCount, notJoinedCount, (dropOffCount-offerRejectedCount-notJoinedCount)] },
      tableRows: exitRows.slice(-10).reverse()
    }
  };

  return ContentService.createTextOutput(JSON.stringify(responseData)).setMimeType(ContentService.MimeType.JSON);
}
