#!/usr/bin/env python
## Copyright (c) 2019, Alliance for Open Media. All rights reserved
##
## This source code is subject to the terms of the BSD 2 Clause License and
## the Alliance for Open Media Patent License 1.0. If the BSD 2 Clause License
## was not distributed with this source code in the LICENSE file, you can
## obtain it at www.aomedia.org/license/software. If the Alliance for Open
## Media Patent License 1.0 was not distributed with this source code in the
## PATENTS file, you can obtain it at www.aomedia.org/license/patent.
##
__author__ = "maggie.sun@intel.com, ryan.lei@intel.com"

import os
from VideoEncoder import VideoEncode
from VideoDecoder import VideoDecode
from VideoScaler import UpScaling, GetDownScaledOutFile, GetUpScaledOutFile
from Config import SUFFIX, LoggerName
from Utils import GetShortContentName, Clip, GetEncLogFile, GetDecPerfFile, \
     GetEncPerfFile
import logging

subloggername = "EncDecUpscale"
loggername = LoggerName + '.' + '%s' % subloggername
logger = logging.getLogger(loggername)

################################################################################
##################### Internal Helper Functions ################################
def GetBitstreamFile(method, codec, test_cfg, preset, yuvfile, qp, outpath):
    bs_suffix = SUFFIX[codec]
    Prefix_EncodeCfg = '_%s_%s_%s_Preset_%s' % (method, codec, test_cfg, preset)
    filename = GetShortContentName(yuvfile, False) + Prefix_EncodeCfg + "_QP_"\
               + str(qp) + bs_suffix
    filename = os.path.join(outpath, filename)
    return filename

def GetDecodedFile(bsfile, outpath, decode_to_yuv):
    suffix = ".yuv" if decode_to_yuv else ".y4m"
    filename = GetShortContentName(bsfile, False) + '_Decoded' + suffix
    decodedfile = os.path.join(outpath, filename)
    return decodedfile

################################################################################
##################### Major Functions ##########################################
def Encode(method, codec, preset, clip, test_cfg, qp, num, bs_path, perf_path,
           log_path, LogCmdOnly=False):
    bsfile = GetBitstreamFile(method, codec, test_cfg, preset, clip.file_path,
                              qp, bs_path)
    enc_perf = GetEncPerfFile(bsfile, perf_path)
    enc_log = GetEncLogFile(bsfile, log_path)
    # call VideoEncoder to do the encoding
    VideoEncode(method, codec, clip, test_cfg, qp, num, bsfile, preset, enc_perf,
                enc_log, LogCmdOnly)
    return bsfile

def Decode(method, test_cfg, codec, bsfile, path, perf_path, decode_to_yuv, LogCmdOnly=False):
    decodedfile = GetDecodedFile(bsfile, path, decode_to_yuv)
    dec_perf = GetDecPerfFile(bsfile, perf_path)
    #call VideoDecoder to do the decoding
    VideoDecode(method, test_cfg, codec, bsfile, decodedfile, dec_perf, decode_to_yuv, LogCmdOnly)
    return decodedfile

def Run_EncDec_Upscale(method, codec, preset, clip, test_cfg, QP, num, outw,
                       outh, path_bs, path_decoded, path_upscaled, path_cfg,
                       path_perf, path_enc_log, upscale_algo, LogCmdOnly = False):
    logger.info("%s %s start encode file %s with QP = %d" %
                (method, codec, clip.file_name, QP))
    bsFile = Encode(method, codec, preset, clip, test_cfg, QP, num, path_bs,
                    path_perf, path_enc_log, LogCmdOnly)
    logger.info("start decode file %s" % os.path.basename(bsFile))
    decodedYUV = Decode(method, test_cfg, codec, bsFile, path_decoded, path_perf, False,
                        LogCmdOnly)
    logger.info("start upscale file %s" % os.path.basename(decodedYUV))
    #hard code frame rate to 0 before upscaling.
    #TODO: change to real frame rate after decoder fix the issue
    dec_clip = Clip(GetShortContentName(decodedYUV, False) + ".y4m",
                    decodedYUV, clip.file_class, clip.width, clip.height,
                    clip.fmt, 0, 0, clip.bit_depth)
    upscaledYUV = UpScaling(dec_clip, num, outw, outh, path_upscaled, path_cfg,
                            upscale_algo, LogCmdOnly)
    logger.info("finish Run Encode, Decode and Upscale")
    return upscaledYUV


def GetBsReconFileName(encmethod, codecname, test_cfg, preset, clip, dw, dh,
                       dnScAlgo, upScAlgo, qp, path_bs, ds_on_the_fly=True, ratio_idx=0):
    dsyuv_name = GetDownScaledOutFile(clip, dw, dh, path_bs, dnScAlgo, ds_on_the_fly, ratio_idx)
    # return bitstream file with absolute path
    bs = GetBitstreamFile(encmethod, codecname, test_cfg, preset, dsyuv_name,
                          qp, path_bs)
    decoded = GetDecodedFile(bs, path_bs, False)
    ds_clip = Clip(GetShortContentName(decoded, False) + ".y4m",
                   decoded, clip.file_class, dw, dh, clip.fmt, clip.fps_num,
                   clip.fps_denom, clip.bit_depth)
    reconfilename = GetUpScaledOutFile(ds_clip, clip.width, clip.height,
                                       upScAlgo, path_bs)
    # return only Recon yuv file name w/o path
    reconfilename = GetShortContentName(reconfilename, False) + ".y4m"
    return bs, reconfilename
