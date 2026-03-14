function deleteExistingRows(mmrOutputSheet) 
{
   var start, howManyToDelete;
   start = 2;
   var lastRow = mmrOutputSheet.getLastRow();
   if (lastRow != 1)
   {
       //NU howManyToDelete = mmrOutputSheet.getLastRow() - start + 1;
       mmrOutputSheet.deleteRows(start, howManyToDelete);
   }
}
