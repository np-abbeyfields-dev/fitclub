function build2DArrayOfWorkouts(commaReplacedWorkouts) 
{
    var arrayOfAllWorkouts1D = commaReplacedWorkouts.split("NWN");
     var arrayOfAllWorkouts1DModified = new Array();
   
      for (var i = 0; i < arrayOfAllWorkouts1D.length; i++) 
      {
         arrayOfAllWorkouts1DModified[i] = arrayOfAllWorkouts1D[i+1];
      }
  
      //NU var arrayOfAllWorkouts2D = new Array();
      for (var i = 0; i < arrayOfAllWorkouts1DModified.length-1; i++) 
      {
     
        if (!(arrayOfAllWorkouts1DModified[i].includes("cals")))
        {
            arrayOfAllWorkouts1DModified[i] = arrayOfAllWorkouts1DModified[i] + "SWN + cals= 0";
        }
        
        var eachWorkoutSplitArray = arrayOfAllWorkouts1DModified[i].split("SWN");
 
        arrayOfAllWorkouts2D[i] = new Array();

        for (var j = 0; j < eachWorkoutSplitArray.length; j++) 
        {
          var eachWorkoutSplitItem  = eachWorkoutSplitArray[j];
          arrayOfAllWorkouts2D[i][j] = eachWorkoutSplitItem;
        }
      }
  
      for (var i = 0; i < arrayOfAllWorkouts2D.length; i++) 
      {
        for (var j = 0; j < arrayOfAllWorkouts2D[i].length; j++) 
        {
        
          eachWorkoutElementSplit = arrayOfAllWorkouts2D[i][j].split("=");
          eachWorkoutElementSplitIdToTake = eachWorkoutElementSplit[0];
          eachWorkoutElementSplitValueToTake = eachWorkoutElementSplit[1];
          if (eachWorkoutElementSplitIdToTake == " + Active Time")
          {
              eachWorkoutElementSplitValueToTake = eachWorkoutElementSplit[1]/60;
             arrayOfAllWorkouts2D[i][j] = eachWorkoutElementSplitValueToTake;
                        //Logger.log (arrayOfAllWorkouts2D[i][j]);
            
                            //Logger.log ("Active  Tim === " + arrayOfAllWorkouts2D[i][j]);

           }
          if (eachWorkoutElementSplitIdToTake == " + Elapsed Time")
          {
              eachWorkoutElementSplitValueToTake = eachWorkoutElementSplit[1]/60;
            arrayOfAllWorkouts2D[i][j] = eachWorkoutElementSplitValueToTake;
                        //Logger.log (arrayOfAllWorkouts2D[i][j]);

                            //Logger.log ("Elapsed Tim === " + arrayOfAllWorkouts2D[i][j]);

          }
         
          if (eachWorkoutElementSplitIdToTake == " + cals")
          {
            //Logger.log (" cals == " + eachWorkoutElementSplit[1]);
            //if (eachWorkoutElementSplit[1] != null)
            //{
                eachWorkoutElementSplitValueToTake = eachWorkoutElementSplit[1] * 0.0002388458966275;
                arrayOfAllWorkouts2D[i][j] = eachWorkoutElementSplitValueToTake;
                //Logger.log ("cals === " + arrayOfAllWorkouts2D[i][j]);
            //}
            //else
            //{
              //arrayOfAllWorkouts2D[i][j] = "0";
            //}

          }
          
           if (eachWorkoutElementSplitIdToTake == " + start_datetime")
          {
            var x1 = eachWorkoutElementSplit[1].split("=");
            arrayOfAllWorkouts2D[i][j] = x1;
            //Logger.log (arrayOfAllWorkouts2D[i][j]);

          }

          if (eachWorkoutElementSplitIdToTake == " + distance")
          {
            var x1 = eachWorkoutElementSplit[1].split("=");
            arrayOfAllWorkouts2D[i][j] = x1/1000;
            //Logger.log (arrayOfAllWorkouts2D[i][j]);

          }

          if (eachWorkoutElementSplitIdToTake == " + activityTypeId")
          {
            var x1 = eachWorkoutElementSplit[1].split("=");
            arrayOfAllWorkouts2D[i][j] = x1;
            //Logger.log (arrayOfAllWorkouts2D[i][j]);

          }
/*
           if (eachWorkoutElementSplitIdToTake == " + avgSpeed")
          {
            var x1 = eachWorkoutElementSplit[1].split("=");
            arrayOfAllWorkouts2D[i][j] = x1;
            //Logger.log (arrayOfAllWorkouts2D[i][j]);

          }

           if (eachWorkoutElementSplitIdToTake == " + avgCadence")
          {
            var x1 = eachWorkoutElementSplit[1].split("=");
            arrayOfAllWorkouts2D[i][j] = x1;
            //Logger.log (arrayOfAllWorkouts2D[i][j]);

          }

           if (eachWorkoutElementSplitIdToTake == " + steps")
          {
            var x1 = eachWorkoutElementSplit[1].split("=");
            arrayOfAllWorkouts2D[i][j] = x1;
            //Logger.log (arrayOfAllWorkouts2D[i][j]);

          }

       */   
          
        }
   
      }
      return arrayOfAllWorkouts2D;
  
  
}
