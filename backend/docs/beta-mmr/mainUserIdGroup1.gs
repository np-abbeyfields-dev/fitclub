function UserIdGroup1() 
{
  var executionSuccess = 0;
  var executionSuccessfull = 0;
  
  updateExecutionStatus(executionSuccessfull) ;
  
  var mmrOutputSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('MMROutput');
  
  deleteExistingRows(mmrOutputSheet);
 
  var userIdSheet = 
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName('UserIds');
  var data = userIdSheet.getDataRange().getValues();
  
  //Logger.log("no of users = " + data.length);
  
  var spreadSheetArray = new Array();
  
  for (var i = 0; i < data.length; i++)  
  {
     var userIdToFetchWorkouts = data[i][0];
     var numberOfWorkoutsToFetchForUserId = data[i][3];
     // @ts-ignore
     var numberOfFetchLoops = numberOfWorkoutsToFetchForUserId/40;
     numberOfFetchLoopsRoundString = Math.round(numberOfFetchLoops);
     numberOfFetchLoopsRoundInt = Math.abs(numberOfFetchLoopsRoundString);
     numberOfFetchLoopsToDo = numberOfFetchLoopsRoundInt + 1;
     //Logger.log("fetching start for " + userIdToFetchWorkouts + "    "  + data[i][1]);
     
     //Logger.log("numberOfFetchLoops " + numberOfFetchLoopsToDo);
     var options = assistUrlBuildingOptions();
    
     for (var j= 0; j < numberOfFetchLoopsToDo; j++)
     {
        var offsetCounter = 40*j;
        //NU var url1 = "https://mapmyride.api.ua.com/v7.2/workout/?user=";
        var url2 = "&limit=40";
        var url3 = "&offset=";
        var url4 = "&order_by=-start_datetime";
        var url = url1 + userIdToFetchWorkouts + url2 + url3 
                  +  offsetCounter + url4;
       
        //Logger.log ("j == " + j);
        //Logger.log ("url == " + url);
        var response = UrlFetchApp.fetch(url, options).getContentText();
        //Logger.log ("response == " + response);
        commaReplacedWorkouts = getAllWorkoutsInStringFormat(response, userIdToFetchWorkouts);
    
        arrayOfAllWorkouts2D = build2DArrayOfWorkouts(commaReplacedWorkouts);
     
        //Logger.log("all workouts 5555 ="+arrayOfAllWorkouts2D);
    
        if (arrayOfAllWorkouts2D != "")
        {
           //Logger.log("writing to xl for j == " + j);
            mmrOutputSheet.getRange(mmrOutputSheet.getLastRow()+1, 1, 
                    arrayOfAllWorkouts2D.length, 
                    arrayOfAllWorkouts2D[0].length).setValues(arrayOfAllWorkouts2D);

        }
     
    }
    executionSuccess = executionSuccess + 1;
  }

   if (executionSuccess == data.length)
   {
     executionSuccessfull = 1;
   }
  
   updateExecutionStatus(executionSuccessfull) ;
  
   return 0;
}
