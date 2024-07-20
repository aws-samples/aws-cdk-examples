import { CfnTable } from "aws-cdk-lib/aws-glue";
import { CfnDataSet } from "aws-cdk-lib/aws-quicksight";

// Define constant for the QuickSight RW and ReadOnly group name
const QS_GROUP_NAME = `QS-Developers`;
const QS_RO_GROUP_NAME = `QS-Readers`;

// Function to get the ARN of the QuickSight group having RW permissions
export const getQuicksightReadWriteGroupArn = (region: string, account: string) => {
    return `arn:aws:quicksight:${region}:${account}:group/default/${QS_GROUP_NAME}`;
}

// Function to get the ARN of the QuickSight group  having R permissions
export const getQuicksightReadOnlyGroupArn = (region: string, account: string) => {
    return `arn:aws:quicksight:${region}:${account}:group/default/${QS_RO_GROUP_NAME}`;
};

// Define the permissions for QuickSight Read/Write Dataset Access
export const QS_RW_DATASET_ACCESS = [
    "quicksight:DescribeDataSet","quicksight:DescribeDataSetPermissions","quicksight:PassDataSet",
    "quicksight:DescribeIngestion","quicksight:ListIngestions","quicksight:UpdateDataSet",
    "quicksight:DeleteDataSet","quicksight:CreateIngestion","quicksight:CancelIngestion",
    "quicksight:UpdateDataSetPermissions"
];

// Define the permissions for QuickSight Read/Write Analysis Access
export const QS_RW_ANALYSIS_ACCESS = [
    "quicksight:RestoreAnalysis", "quicksight:UpdateAnalysisPermissions", "quicksight:DeleteAnalysis",
    "quicksight:DescribeAnalysisPermissions", "quicksight:QueryAnalysis", "quicksight:DescribeAnalysis",
    "quicksight:UpdateAnalysis"
];

// Define the permissions for QuickSight ReadOnly Dashboard Access
export const QS_RO_DATASET_ACCESS = [
    "quicksight:ListIngestions", "quicksight:DescribeDataSetPermissions",
    "quicksight:DescribeDataSet", "quicksight:PassDataSet", "quicksight:DescribeIngestion",
];

// Define the permissions for QuickSight Read/Write Dashboard Access
export const QS_RW_DASHBOARD_ACCESS = [
    "quicksight:DescribeDashboard", "quicksight:ListDashboardVersions", "quicksight:UpdateDashboardPermissions",
    "quicksight:QueryDashboard", "quicksight:UpdateDashboard", "quicksight:DeleteDashboard",
    "quicksight:DescribeDashboardPermissions", "quicksight:UpdateDashboardPublishedVersion"
];

// Define the permissions for QuickSight ReadOnly Dashboard Access
export const QS_RO_DASHBOARD_ACCESS = [
    "quicksight:DescribeDashboard", "quicksight:ListDashboardVersions",
    "quicksight:QueryDashboard",
];

// Define the permissions for QuickSight Read-Only DataSource Access
export const QS_RO_DATASOURCE_ACCESS = [
    "quicksight:DescribeDataSource", "quicksight:DescribeDataSourcePermissions",
    "quicksight:PassDataSource"
];

// Class containing static methods for various transformation operations on QuickSight datasets
export class DatasetTransformationOperations {
    // Method to cast a column to DATETIME type with a specified format
    static dateCastOnColumn(columnName: string, format: string) : CfnDataSet.TransformOperationProperty {
        return this.castOnColumn(columnName, 'DATETIME', format);
    }

    // Generic method to cast a column to a new type with an optional format
    static castOnColumn(columnName: string, newColumnType: string, format?: string) : CfnDataSet.TransformOperationProperty {
        return { 
            castColumnTypeOperation: {
                columnName,
                newColumnType,
                format,
            }
        };
    }

    // Method to cast a column to DECIMAL type
    static decimalCastOnColumn(columnName: string) : CfnDataSet.TransformOperationProperty {
        return this.castOnColumn(columnName, 'DECIMAL');
    }

    // Method to cast a column to INTEGER type
    static intCastOnColumn(columnName: string) : CfnDataSet.TransformOperationProperty {
        return this.castOnColumn(columnName, 'INTEGER');
    }

    // Method to tag a column with a specified tag
    static tagOnColumn(columnName: string, tag: string) : CfnDataSet.TransformOperationProperty {
        return { 
            tagColumnOperation: {
                columnName,
                tags: [
                    {
                        columnGeographicRole: tag
                    }
                ]
            }
        };
    }

    // Method to tag a column as a COUNTRY
    static countryTagOnColumn(columnName: string) : CfnDataSet.TransformOperationProperty {
        return this.tagOnColumn(columnName, "COUNTRY");
    }

    // Method to tag a column as LATITUDE
    static latitudeTagOnColumn(columnName: string) : CfnDataSet.TransformOperationProperty {
        return this.tagOnColumn(columnName, "LATITUDE");
    }

    // Method to tag a column as LONGITUDE
    static longitudeTagOnColumn(columnName: string) : CfnDataSet.TransformOperationProperty {
        return this.tagOnColumn(columnName, "LONGITUDE");
    }

    // Method to tag a column as STATE
    static stateTagOnColumn(columnName: string) : CfnDataSet.TransformOperationProperty {
        return this.tagOnColumn(columnName, "STATE");
    }

    // Method to rename a column
    static renameColumn(columnName: string, newColumnName: string) : CfnDataSet.TransformOperationProperty {
        return {
            renameColumnOperation: {
                columnName,
                newColumnName
            }
        };
    }

    // Method to project (select) a subset of columns, excluding specified columns
    static projectionTransformation(columnNames: string[], exludeColumnNames: string[] = []) : CfnDataSet.TransformOperationProperty {
        const finalColumnNames = columnNames.filter(n => !exludeColumnNames.includes(n));
        return { 
            projectOperation: {
                projectedColumns: finalColumnNames,
            }
        };
    }
}

// Function to convert Glue columns to QuickSight input columns
export const glueToQuicksightColumns = (glueColumns: CfnTable.ColumnProperty[]) : CfnDataSet.InputColumnProperty[] => {
    return glueColumns.map(
        c => { 
            let resultType;
            if (c.type === 'int') {
                resultType = 'INTEGER';
            } else if (c.type === 'double') {
                resultType = 'DECIMAL';
            } else {
                resultType = c.type ? c.type.toUpperCase() : 'STRING'
            }
            return { 
                name: c.name, 
                type: resultType,
            };
        }
    );
}

// Function to make a name from an ID by capitalizing the first letter and replacing underscores with spaces
export const makeNameFromId = (tableId: string) => {
    const words = tableId.split("_");
    return words.map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

// Function to create CSV columns with a specified width
export const makeCsvColumns = (width: number) => {
    return [...Array(width).keys()].map(i => { return { name: `ColumnId-${i+1}`, type: "STRING" }; });
}
