import { Construct } from 'constructs';
import { CfnDataSet, CfnRefreshSchedule } from 'aws-cdk-lib/aws-quicksight';
import { Stack } from 'aws-cdk-lib';
import * as util from './qs-util';

// Interface defining the properties for the QuickSightSingleSourceConstruct
export interface QuickSightSingleSourceConstructProps {
    datasetName?: string; // Optional name of the dataset
    columns: CfnDataSet.InputColumnProperty[]; // Array of input column properties
    transformations: CfnDataSet.TransformOperationProperty[]; // Array of transformation operations to apply to the dataset
    permissions?: CfnDataSet.ResourcePermissionProperty[]; // Optional array of resource permissions
    refreshScheduleProperties?: CfnRefreshSchedule.RefreshScheduleMapProperty; // Optional refresh schedule properties
    excludeColumnNames?: string[]; // Optional array of column names to exclude
    importMode?: string; // Optional import mode, default is 'SPICE'
}

// Constant for the default import mode
const QS_IMPORT_MODE = 'SPICE';

// Abstract class for creating a QuickSight single source dataset construct
// Quicksight datasets provide analysis capabilities, e.g. create joins for enrichment etc
// This construct does not support analysis, as typically this can be done better with services specialized for analysis, like Glue
export abstract class QuickSightSingleSourceDatasetConstruct extends Construct {

    // Abstract methods to be implemented by subclasses
    abstract getDataSetId(): string;
    abstract getPhysicalTableDef(): CfnDataSet.PhysicalTableProperty;
    
    constructor(scope: Construct, id: string) {
        super(scope, id);
    }

    // Method to check if an object is resolvable and throw an error if it is
    failIfResolvable(v: object) {
        // eslint-disable-next-line no-prototype-builtins
        if (v && v.hasOwnProperty('resolve')) {
            throw new Error('No support for Resolvables');
        }
    }

    // Method to build the dataset
    protected buildDataset(id: string, props: QuickSightSingleSourceConstructProps) {
        const dataSetId = this.getDataSetId();
        const datasetName = props.datasetName ?? util.makeNameFromId(dataSetId);
        
        // Define default permissions if not provided
        const permissions = props.permissions ?? [
            {
                principal: util.getQuicksightReadWriteGroupArn(Stack.of(this).region, Stack.of(this).account),
                actions: util.QS_RW_DATASET_ACCESS
            },
            {
                principal: util.getQuicksightReadOnlyGroupArn(Stack.of(this).region, Stack.of(this).account),
                actions: util.QS_RO_DATASET_ACCESS,
            },
        ];
        
        // Set of target column names
        const targetColumnNames = new Set(props.columns.map(c => c.name));

        // Function to check if a column name exists in the target columns
        const checkColumnNameExists = (operation: CfnDataSet.CastColumnTypeOperationProperty | CfnDataSet.RenameColumnOperationProperty | CfnDataSet.TagColumnOperationProperty) => {
            const columnName = operation.columnName;
            if (!targetColumnNames.has(columnName)) {
                throw new Error(`Invalid transformation on non-existent column ${columnName}`);
            }
        };

        // Function to handle rename operations
        const treatRenameOperation = (renameOperation: CfnDataSet.RenameColumnOperationProperty) => {
            const newColumnName = renameOperation.newColumnName;
            if (targetColumnNames.has(newColumnName)) { 
                throw new Error(`Invalid rename transformation. Column ${newColumnName} already exists`);
            }
            targetColumnNames.add(newColumnName);
            targetColumnNames.delete(renameOperation.columnName);
        };

        // Function to handle create operations
        const treatCreateOperation = (createOperation: any) => {
            const columns = createOperation.columns;
            this.failIfResolvable(columns);
            columns.forEach((column: any) => {
                this.failIfResolvable(column);
                const newColumnName = column.columnName;
                if (targetColumnNames.has(newColumnName)) {
                    throw new Error(`Invalid create column transformation. Column ${newColumnName} already exists`);
                }
                targetColumnNames.add(newColumnName);
            });
        };
        
        // Iterate through transformations and apply checks and treatments
        props.transformations.forEach((transformation: CfnDataSet.TransformOperationProperty) => {
            const operations = [transformation?.castColumnTypeOperation, transformation?.renameColumnOperation, transformation?.tagColumnOperation].filter(operation => operation !== undefined);
            for (const anyOperation of operations) {
                if (anyOperation === undefined) {
                    continue;
                }
                    
                this.failIfResolvable(anyOperation);
                const operation = anyOperation as CfnDataSet.CastColumnTypeOperationProperty | CfnDataSet.RenameColumnOperationProperty | CfnDataSet.TagColumnOperationProperty;
                checkColumnNameExists(operation);
            }
        
            if (transformation?.renameColumnOperation) {
                const renameOperation = transformation?.renameColumnOperation as CfnDataSet.RenameColumnOperationProperty;
                treatRenameOperation(renameOperation);

            } else if (transformation?.createColumnsOperation) {
                this.failIfResolvable(transformation?.createColumnsOperation);
                const createOperation = transformation?.createColumnsOperation;
                treatCreateOperation(createOperation);
            }
        });
        
        // Include projection transformation if excludeColumnNames is provided
        const dataTransforms = props.excludeColumnNames ? [...props.transformations, util.DatasetTransformationOperations.projectionTransformation([...targetColumnNames], props.excludeColumnNames)] :
            props.transformations;

        // Create the QuickSight dataset
        const ds = new CfnDataSet(this, `${id}-data-set`, {
            name: datasetName,
            awsAccountId: Stack.of(this).account,
            dataSetId,
            importMode: props.importMode ?? QS_IMPORT_MODE,
            physicalTableMap: {
                anyKey: this.getPhysicalTableDef(),
            },
            logicalTableMap: {
                anything: {
                    alias: dataSetId,
                    source: {
                        physicalTableId: "anyKey",
                    },
                    dataTransforms,
                },
            },
            permissions,
        });

        // Create a refresh schedule if refreshScheduleProperties is provided
        // For datasets based on single Athena tables populated after a Glue ETL Job, better use the refresh functionality provided inside QuickSightAutomationsConstruct
        if (props.refreshScheduleProperties) {
            const refreshScheduleProperties = {
                ...props.refreshScheduleProperties,
                scheduleId: `${id}-qs-schedule`,
            };
            const schedule = new CfnRefreshSchedule(this, `${id}-data-set-refresh-schedule`, {
                awsAccountId: Stack.of(this).account,
                dataSetId,
                schedule: refreshScheduleProperties,
            });
            schedule.addDependency(ds);
        }
    }
}
