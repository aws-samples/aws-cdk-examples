#!/bin/bash
echo AWS_BATCH_JOB_ARRAY_INDEX:${AWS_BATCH_JOB_ARRAY_INDEX}
echo INDEX:${INDEX}
FILE_NAME=`echo ${INPUT_KEY} | rev | cut -d '/' -f 1 | rev`
aws s3 cp "s3://${INPUT_BUCKET}/${INPUT_KEY}" "${WORK_DIR}/${FILE_NAME}"
tempdir=`mktemp -d` && cd ${tempdir}
awk '{print $1$1}' ${WORK_DIR}/${FILE_NAME} > repeat_${FILE_NAME}
aws s3 cp ${tempdir}/repeat_${FILE_NAME} s3://${OUTPUT_BUCKET}/${OUTPUT_KEY}/repeat_${FILE_NAME}