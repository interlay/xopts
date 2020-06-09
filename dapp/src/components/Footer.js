import { Container, Col } from "react-bootstrap";
import React, { Component } from "react";
import { Link } from "react-router-dom";
import { withRouter } from 'react-router-dom'
import xoptsLogo from "../assets/img/xopts.png";
import { FaTelegramPlane, FaMediumM, FaGitlab, FaGithub, FaTwitter } from 'react-icons/fa';
import BalanceTopbar from './BalanceTopbar.js';


class Footer extends Component {

    render() {
        return (
            <footer class="footer">
                <Container>
                        <div class="row">
                            <div class="col-md-6 col-xs-12">
                                <div class="float-left nav-link text-capitalize">
                                    &copy;
                        <script>
                                        document.write(new Date().getFullYear())
                        </script> Interlay. All Rights Reserved | <a class=" text-capitalize" rel="tooltip" title="" data-placement="bottom"
                                        href="../docs/privacy-policy.pdf" target="_blank">Privacy Policy
                        </a>
                                </div>

                            </div>
                            <div class="col-md-6 col-xs-12">
                                <div class="float-right">
                                    <a class="nav-link" rel="tooltip" title="" data-placement="bottom"
                                        href="http://linkedin.com/company/interlay" target="_blank"
                                        data-original-title="Follow us on LinkedIn">
                                        <i class="fa fa-linkedin"></i>
                                    </a>
                                </div>
                                <div class="float-right">
                                    <a class="nav-link" rel="tooltip" title="" data-placement="bottom"
                                        href="https://t.me/interlay" target="_blank"
                                        data-original-title="Join our Telegram channel">
                                        <FaTelegramPlane></FaTelegramPlane>
                                    </a>
                                </div>
                                <div class="float-right">
                                    <a class="nav-link" rel="tooltip" title="" data-placement="bottom"
                                        href="https://medium.com/Interlay" target="_blank" data-original-title="Follow us on Medium">
                                        <FaMediumM></FaMediumM>
                                    </a>
                                </div>
                                <div class="float-right">
                                    <a class="nav-link" rel="tooltip" title="" data-placement="bottom"
                                        href="https://gitlab.com/interlay" target="_blank" data-original-title="Follow us on Gitlab">
                                        <FaGitlab></FaGitlab>
                                    </a>
                                </div>
                                <div class="float-right">
                                    <a class="nav-link" rel="tooltip" title="" data-placement="bottom"
                                        href="https://github.com/interlay" target="_blank" data-original-title="Follow us on Github">
                                        <FaGithub></FaGithub>
                                    </a>
                                </div>
                                <div class="float-right">
                                    <a class="nav-link" rel="tooltip" title="" data-placement="bottom"
                                        href="https://twitter.com/interlayHQ" target="_blank"
                                        data-original-title="Follow us on Twitter">
                                        <FaTwitter></FaTwitter>
                                    </a>
                                </div>
                                <div class="float-right">
                                    <a class="nav-link lowercase" rel="tooltip" title="" data-placement="bottom"
                                        href="mailto:contact@interlay.io" target="_blank" data-original-title="Drop us an email">
                                        contact@interlay.io
                        </a>
                                </div>
                            </div>
                        </div>
                </Container>
            </footer>
        );
    }
}

export default withRouter(Footer);
