import { Construct } from 'constructs';
import { CfnDataSet, CfnDataSource } from 'aws-cdk-lib/aws-quicksight';
import { QuickSightSingleSourceConstructProps, QuickSightSingleSourceDatasetConstruct } from './qs-single-source-dataset-construct';

export interface QuickSightAthenaTableDatasetConstructProps extends QuickSightSingleSourceConstructProps {
    athenaDbName: string;
    athenaTableName: string;
    dataSource: CfnDataSource;
    dataSetId?: string;
}
// Defining an interface that specializes QuickSightSingleSourceConstructProps for a single Athena table
// This interface includes additional properties specific to an Athena table dataset

export class QuickSightAthenaTableDataset extends QuickSightSingleSourceDatasetConstruct {
    // Creating a class that specializes QuickSightSingleSourceDatasetConstruct for a single Athena table

    getDataSetId(): string {
        return this.props.dataSetId ?? this.props.athenaTableName;
        // Typically set the datasetId equal to the athenaTableName
        // Override for special cases
    }

    getPhysicalTableDef(): CfnDataSet.PhysicalTableProperty {
        // Method to get the physical table definition for the QuickSight dataset
        const props = this.props;
        return {
            relationalTable: {
                dataSourceArn: props.dataSource.attrArn,
                // Setting the data source ARN from the provided dataSource

                inputColumns: props.columns,
                // Setting the input columns for the table

                name: props.athenaTableName,
                // Setting the table name

                schema: props.athenaDbName,
                // Setting the schema (database name)
            }
        };
    }

    constructor(scope: Construct, id: string, protected props: QuickSightAthenaTableDatasetConstructProps) {
        super(scope, id);
        // Calling the constructor of the parent class

        super.buildDataset(id, props);
        // Calling the buildDataset method from the parent class to build the dataset
    }
}
