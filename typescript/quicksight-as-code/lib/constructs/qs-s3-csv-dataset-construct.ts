import { Construct } from 'constructs';
import { CfnDataSet, CfnDataSource } from 'aws-cdk-lib/aws-quicksight';
import { QuickSightSingleSourceConstructProps, QuickSightSingleSourceDatasetConstruct } from './qs-single-source-dataset-construct';

// Defining an interface for the properties of QuickSightS3CSVDatasetConstruct
export interface QuickSightS3CSVDatasetConstructProps extends QuickSightSingleSourceConstructProps {
    dataSource: CfnDataSource; // The data source for the QuickSight dataset
    dataSetId: string; // The ID for the QuickSight dataset
}

// Creating a class that specializes QuickSightSingleSourceDatasetConstruct for a single S3 CSV source
// Using the specific CSV format of the AWS sample CSV datasets of bucket spaceneedle-samplefiles.prod.{region}
export class QuickSightS3CSVDataset extends QuickSightSingleSourceDatasetConstruct {

    // Method to get the dataset ID
    getDataSetId(): string {
        return this.props.dataSetId; // Returning the dataset ID from the props
    }

    // Method to get the physical table definition for the QuickSight dataset
    getPhysicalTableDef(): CfnDataSet.PhysicalTableProperty {
        const props = this.props;
        return {
            s3Source: { // properties specific to the AWS sample CSV datasets
                dataSourceArn: props.dataSource.attrArn, // Setting the data source ARN from the provided dataSource
                inputColumns: props.columns, // Setting the input columns for the table
                uploadSettings: {
                    format: 'CSV', // Specifying the format of the uploaded file
                    startFromRow: 1, // Indicating that the data starts from the first row
                    containsHeader: true, // Indicating that the CSV file contains a header row
                    textQualifier: 'DOUBLE_QUOTE', // Setting the text qualifier to double quotes
                    delimiter: ',', // Setting the delimiter to a comma
                }
            }
        };
    }

    // Constructor for QuickSightS3CSVDataset class
    constructor(scope: Construct, id: string, protected props: QuickSightS3CSVDatasetConstructProps) {
        super(scope, id); // Calling the constructor of the parent class
        super.buildDataset(id, props); // Calling the buildDataset method from the parent class to build the dataset
    }
}
