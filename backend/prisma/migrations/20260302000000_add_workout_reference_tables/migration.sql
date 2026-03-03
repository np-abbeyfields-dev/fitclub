-- CreateTable
CREATE TABLE "generic_workout_met" (
    "id" SERIAL NOT NULL,
    "workout_type" TEXT NOT NULL,
    "avg_met_per_hour" DOUBLE PRECISION,
    "min_met" DOUBLE PRECISION,
    "max_met" DOUBLE PRECISION,
    "mlp" DOUBLE PRECISION,
    "max_met_limit" DOUBLE PRECISION,
    "met_cap" DOUBLE PRECISION,

    CONSTRAINT "generic_workout_met_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutMaster" (
    "id" SERIAL NOT NULL,
    "workoutType" TEXT NOT NULL,
    "genericWorkoutType" TEXT NOT NULL,

    CONSTRAINT "WorkoutMaster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "generic_workout_met_workout_type_key" ON "generic_workout_met"("workout_type");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutMaster_workoutType_key" ON "WorkoutMaster"("workoutType");

-- AddForeignKey
ALTER TABLE "WorkoutMaster" ADD CONSTRAINT "WorkoutMaster_genericWorkoutType_fkey" FOREIGN KEY ("genericWorkoutType") REFERENCES "generic_workout_met"("workout_type") ON DELETE RESTRICT ON UPDATE CASCADE;
