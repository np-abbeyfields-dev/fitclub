function getAllWorkoutsInStringFormat(response,userIdToFetchWorkouts) 
{
       var response2 = JSON.parse(response);
       var response3 = response2._embedded;
       //Logger.log(response2);
       var response4 = response3["workouts"];
       var response5 = response4["contexts"];
  
       //Logger.log(response4);
       var workout = 
           {
             //NU name : "name",
             time: "t",
             distance : "d",
             activityTypeId : "id",
             avgSpeed : "s",
             avgCadence : "c",
             steps : "s",
             cals : "t"
           };
  
      var workouts = new Array(workout);
      var allWorkouts ="";
  
      for (var [key,val] of Object.entries(response4)) 
      {
        //Logger.log("key ==" + key);
        for (var [key1,val1] of Object.entries(val)) 
        {
           //Logger.log("key1 ==" + key1);

           
          if (key1 == "name")
          {
            workout.name = val1;
            allWorkouts = allWorkouts + "NWN " + userIdToFetchWorkouts + " SWN name=" + val1;
          }
          if (key1 == "start_datetime")
          {
            workout.start_datetime = val1;
            allWorkouts = allWorkouts + "SWN + start_datetime=" + val1;
          }
          
           if (key1 == "_links")
           {
                
                for (var [key2,val2] of Object.entries(val1)) 
                {
                  //Logger.log("key2 ==" + key2);    
                  //Logger.log("val2 ==" + val2);    
                  if (key2 == "activity_type")
                  {
                    //Logger.log("Kittipoyi......... ==" + val2);
                    for (var [key3,val3] of Object.entries(val2)) 
                    {
                      for (var [key4,val4] of Object.entries(val3)) 
                      {
                          if(val4.indexOf("activity_type") == -1)
                          {
                            //Logger.log("val4 ==" + val4); 
                            workout.activityTypeId = val4;
                            allWorkouts = allWorkouts + "SWN + activityTypeId=" + val4;
                          }

                      }
                    
                    } 
                  }
                
                }
           }
          if (key1 == "aggregates")
          {
             for (var [key2,val2] of Object.entries(val1)) 
             {
              //Logger.log("key2 ==" + key2);    
           
               if (key2 == "elapsed_time_total")
               {
                 workout.time = val2;
                 allWorkouts = allWorkouts + "SWN + Elapsed Time=" + val2;
               }
               
                if (key2 == "active_time_total")
               {
                 workout.time = val2;
                 allWorkouts = allWorkouts + "SWN + Active Time=" + val2;
               }
                if (key2 == "metabolic_energy_total")
               {
                 workout.cals = val2;
                 //Logger.log("cals="+val2)
                 allWorkouts = allWorkouts + "SWN + cals=" + val2;
               }
               if (key2 == "distance_total")
               {
                 workout.distance = val2;
                 //Logger.log("distance_total="+val2)
                 allWorkouts = allWorkouts + "SWN + distance=" + val2;
               }
/*
               speedTemp = 0;
               if (key2 == "speed_avg")
               {
                 speedTemp = 1;
                 Logger.log("speed_avg="+val2)
                 workout.distance = speedTemp;
                 allWorkouts = allWorkouts + "SWN + avgSpeed=" + val2;
               }

               if (key2 == "cadence_avg")
               {
                 workout.distance = val2;
                 Logger.log("cadence_avg="+val2)
                 allWorkouts = allWorkouts + "SWN + avgCadence=" + val2;
               }

               if (key2 == "steps_total")
               {
                 workout.distance = val2;
                 Logger.log("steps_total="+val2)
                 allWorkouts = allWorkouts + "SWN + steps=" + val2;
               }
*/
             }
          }
       }
      }
      //Logger.log("all workouts  ="+allWorkouts);
 
      var commaReplacedWorkouts = allWorkouts.replace(/,/g, ' ');
      var spaceReplacedWorkouts = allWorkouts.replace(/ /g, '');
      return commaReplacedWorkouts;
      //Logger.log("commaReplacedWorkouts  ="+  commaReplacedWorkouts);
}
