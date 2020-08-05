#!/bin/bash
echo AWS_BATCH_JOB_ARRAY_INDEX:${AWS_BATCH_JOB_ARRAY_INDEX}
echo INDEX:${INDEX}
FILE_NAME=`echo ${INPUT_KEY} | rev | cut -d '/' -f 1 | rev`
aws s3 cp "s3://${INPUT_BUCKET}/${INPUT_KEY}" "${WORK_DIR}/${FILE_NAME}"
tempdir=`mktemp -d` && cd ${tempdir}
suffix_num=$[`cat "${WORK_DIR}/${FILE_NAME}" | wc -l`/${SPLIT_NUM}]
split -l ${SPLIT_NUM} -d "${WORK_DIR}/${FILE_NAME}" -a `echo ${suffix_num} |wc -L` ${FILE_NAME}_
ls > ${FILE_NAME}_splitlist
aws s3 sync ${tempdir}/ s3://${OUTPUT_BUCKET}/${OUTPUT_KEY}/