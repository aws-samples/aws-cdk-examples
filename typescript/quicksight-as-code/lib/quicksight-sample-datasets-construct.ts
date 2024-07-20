import { Construct } from 'constructs';
import { CfnDataSource } from 'aws-cdk-lib/aws-quicksight';
import { Stack } from 'aws-cdk-lib';

import { QuickSightS3CSVDataset } from './constructs/qs-s3-csv-dataset-construct';
import * as util from './constructs/qs-util';

// Class for creating QuickSight sample datasets
export class QuickSightSamplesDatasetConstruct extends Construct {

    // Private method to create a QuickSight data source for the AWS samples S3 bucket
    private makeDataSource(id: string) {
        return new CfnDataSource(this, `${id}-qs-data-source`, {
            name: `${id}-qs-data-source`,
            awsAccountId: Stack.of(this).account,
            type: "S3",
            dataSourceId: `${id}-qs-data-source`,
            dataSourceParameters: {
                s3Parameters: {
                    manifestFileLocation: {
                        bucket: `spaceneedle-samplefiles.prod.${Stack.of(this).region}`,
                        key: `${id}/manifest.json`,
                    }
                },
            },
            permissions: [
                {
                    principal: util.getQuicksightReadWriteGroupArn(Stack.of(this).region, Stack.of(this).account),
                    actions: util.QS_RO_DATASOURCE_ACCESS
                }
            ]
        });
    }

    // Constructor for the QuickSightSamplesDatasetConstruct class
    constructor(scope: Construct, id: string) {
        super(scope, id);
        
        // Create data sources for different datasets
        const salesDataSource = this.makeDataSource('sales');
        const webDataSource = this.makeDataSource('marketing');
        const peopleDataSource = this.makeDataSource('hr');
        const businessDataSource = this.makeDataSource('revenue');
        
        // Create QuickSight datasets with transformations for the sales dataset
        new QuickSightS3CSVDataset(this, 'sales-ds', {
            dataSetId: 'sales-ds',
            dataSource: salesDataSource,
            columns: util.makeCsvColumns(12),
            transformations: [
                util.DatasetTransformationOperations.renameColumn('ColumnId-1', 'Date'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-2', 'Salesperson'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-3', 'Lead Name'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-4', 'Segment'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-5', 'Region'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-6', 'Target Close'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-7', 'Forecasted Monthly Revenue'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-8', 'Opportunity Stage'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-9', 'Weighted Revenue'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-10', 'Is Closed'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-11', 'ActiveItem'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-12', 'IsLatest'),

                util.DatasetTransformationOperations.intCastOnColumn('Forecasted Monthly Revenue'),
                util.DatasetTransformationOperations.intCastOnColumn('Weighted Revenue'),
                util.DatasetTransformationOperations.dateCastOnColumn('Target Close', 'M/d/yyyy'),
                util.DatasetTransformationOperations.dateCastOnColumn('Date', 'M/d/yyyy'),
                util.DatasetTransformationOperations.stateTagOnColumn('Region'),
            ],
        });

        // Create QuickSight datasets with transformations for the people dataset
        new QuickSightS3CSVDataset(this, 'people-ds', {
            dataSetId: 'people-ds',
            dataSource: peopleDataSource,
            columns: util.makeCsvColumns(15),
            transformations: [
                util.DatasetTransformationOperations.renameColumn('ColumnId-1', 'Date'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-2', 'Employee Name'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-3', 'Employee ID'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-4', 'Tenure'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-5', 'Monthly Compensation'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-6', 'Date of Birth'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-7', 'Gender'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-8', 'Education'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-9', 'Event Type'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-10', 'Region'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-11', 'Business Function'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-12', 'Job Family'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-13', 'Job Level'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-14', 'Notes'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-15', 'isUnique'),
                
                util.DatasetTransformationOperations.decimalCastOnColumn('Monthly Compensation'),
                util.DatasetTransformationOperations.intCastOnColumn('Tenure'),
                util.DatasetTransformationOperations.dateCastOnColumn('Date of Birth', 'yyyy-MM-dd'),
                util.DatasetTransformationOperations.dateCastOnColumn('Date', 'yyyy-MM-dd'),
                util.DatasetTransformationOperations.stateTagOnColumn('Region'),
            ],
        });

        // Create QuickSight datasets with transformations for the web dataset
        new QuickSightS3CSVDataset(this, 'web-ds', {
            dataSetId: 'web-ds',
            dataSource: webDataSource,
            columns: util.makeCsvColumns(19),
            transformations: [
                util.DatasetTransformationOperations.renameColumn('ColumnId-1', 'Date'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-2', 'New visitors SEO'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-3', 'New visitors CPC'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-4', 'New visitors Social Media'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-5', 'Return visitors'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-6', 'Twitter mentions'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-7', 'Twitter followers adds'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-8', 'Twitter followers cumulative'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-9', 'Mailing list adds'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-10', 'Mailing list cumulative'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-11', 'Website Pageviews'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-12', 'Website Visits'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-13', 'Website Unique Visits'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-14', 'Mobile uniques'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-15', 'Tablet uniques'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-16', 'Desktop uniques'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-17', 'Free sign up'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-18', 'Paid conversion'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-19', 'Events'),
                
                util.DatasetTransformationOperations.intCastOnColumn('Free sign up'),
                util.DatasetTransformationOperations.intCastOnColumn('Paid conversion'),
                util.DatasetTransformationOperations.intCastOnColumn('Tablet uniques'),
                util.DatasetTransformationOperations.intCastOnColumn('Desktop uniques'),
                util.DatasetTransformationOperations.intCastOnColumn('Mailing list adds'),
                util.DatasetTransformationOperations.intCastOnColumn('Twitter followers cumulative'),
                util.DatasetTransformationOperations.intCastOnColumn('Mailing list cumulative'),
                util.DatasetTransformationOperations.intCastOnColumn('Return visitors'),
                util.DatasetTransformationOperations.intCastOnColumn('Website Unique Visits'),
                util.DatasetTransformationOperations.intCastOnColumn('New visitors Social Media'),
                util.DatasetTransformationOperations.intCastOnColumn('Mobile uniques'),
                util.DatasetTransformationOperations.intCastOnColumn('Twitter followers adds'),
                util.DatasetTransformationOperations.intCastOnColumn('Website Pageviews'),
                util.DatasetTransformationOperations.intCastOnColumn('Twitter mentions'),
                util.DatasetTransformationOperations.intCastOnColumn('Website Visits'),
                util.DatasetTransformationOperations.intCastOnColumn('New visitors CPC'),
                util.DatasetTransformationOperations.intCastOnColumn('New visitors SEO'),

                util.DatasetTransformationOperations.dateCastOnColumn('Date', 'M/d/yyyy'),
            ],
        });

        // Create QuickSight datasets with transformations for the business dataset
        new QuickSightS3CSVDataset(this, 'business-ds', {
            dataSetId: 'business-ds',
            dataSource: businessDataSource,
            columns: util.makeCsvColumns(11),
            transformations: [
                util.DatasetTransformationOperations.renameColumn('ColumnId-1', 'Date'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-2', 'Customer ID'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-3', 'Customer Name'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-4', 'Customer Region'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-5', 'Segment'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-6', 'Service Line'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-7', 'Revenue Goal'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-8', 'Billed Amount'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-9', 'Cost'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-10', 'Channel'),
                util.DatasetTransformationOperations.renameColumn('ColumnId-11', 'Distinct ID'),
                
                util.DatasetTransformationOperations.decimalCastOnColumn('Cost'),
                util.DatasetTransformationOperations.decimalCastOnColumn('Billed Amount'),
                util.DatasetTransformationOperations.decimalCastOnColumn('Revenue Goal'),

                util.DatasetTransformationOperations.intCastOnColumn('Distinct ID'),
                util.DatasetTransformationOperations.dateCastOnColumn('Date', 'M/d/yyyy'),
                util.DatasetTransformationOperations.stateTagOnColumn('Customer Region'),
            ],
        });
    }
}
