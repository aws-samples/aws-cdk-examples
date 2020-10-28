#!/bin/bash
echo AWS_BATCH_JOB_ARRAY_INDEX:${AWS_BATCH_JOB_ARRAY_INDEX}
echo INDEX:${INDEX}
tempdir=`mktemp -d` && cd ${tempdir}
aws s3 sync s3://${INPUT_BUCKET}/${INPUT_KEY} ${tempdir}/
cat ${tempdir}/* > ${WORK_DIR}/${PERFIX}_${FILE_NAME}_merge
aws s3 cp ${WORK_DIR}/${PERFIX}_${FILE_NAME}_merge s3://${OUTPUT_BUCKET}/${OUTPUT_KEY}/${PERFIX}_${FILE_NAME}_merge